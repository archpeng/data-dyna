import { z } from "zod";
import { AgentContextBundleSchema, type AgentContextBundle } from "./context-bundle.ts";
import { ExperimentPlanSchema, InterventionHypothesisSchema, type ExperimentPlan, type InterventionHypothesis } from "./experiment-plan.ts";

export const ExperimentValidationDecisionSchema = z.enum(["accept", "block", "needs_more_data"]);
export const ExperimentValidationReasonCodeSchema = z.enum([
  "schema_invalid",
  "identity_mismatch",
  "missing_evidence_refs",
  "evidence_refs_not_from_context",
  "missing_uncertainty_or_confidence",
  "merchant_confirmation_required",
  "rollback_required",
  "guardrail_required",
  "weak_or_insufficient_sample",
  "agent_draft_not_truth",
  "core_write_requested",
]);

export const ExperimentValidationResultSchema = z.object({
  decision: ExperimentValidationDecisionSchema,
  reasonCodes: z.array(ExperimentValidationReasonCodeSchema),
  messages: z.array(z.string().min(1)),
  evidenceRefs: z.array(z.string().min(1)),
});

export type ExperimentValidationDecision = z.infer<typeof ExperimentValidationDecisionSchema>;
export type ExperimentValidationReasonCode = z.infer<typeof ExperimentValidationReasonCodeSchema>;
export type ExperimentValidationResult = z.infer<typeof ExperimentValidationResultSchema>;

export function validateExperimentPlan(input: {
  context: AgentContextBundle;
  hypothesis: unknown;
  experimentPlan: unknown;
}): ExperimentValidationResult {
  const contextParse = AgentContextBundleSchema.safeParse(input.context);
  const hypothesisParse = InterventionHypothesisSchema.safeParse(input.hypothesis);
  const planParse = ExperimentPlanSchema.safeParse(input.experimentPlan);
  const reasonCodes: ExperimentValidationReasonCode[] = [];
  const messages: string[] = [];

  if (!contextParse.success || !hypothesisParse.success || !planParse.success) {
    reasonCodes.push("schema_invalid");
    messages.push("Context, hypothesis, and experiment plan must satisfy deterministic schemas.");
    return result("block", reasonCodes, messages, contextParse.success ? contextParse.data.evidenceRefs : []);
  }

  const context = contextParse.data;
  const hypothesis = hypothesisParse.data;
  const plan = planParse.data;

  checkIdentity(context, hypothesis, plan, reasonCodes, messages);
  checkTruthBoundary(hypothesis, plan, reasonCodes, messages);
  checkEvidenceRefs(context, hypothesis, plan, reasonCodes, messages);
  checkUncertainty(hypothesis, plan, reasonCodes, messages);
  checkSafety(plan, reasonCodes, messages);

  if (hasBlockingReason(reasonCodes)) {
    return result("block", reasonCodes, messages, plan.evidenceRefs);
  }

  if (context.facts.opportunityGap.sampleStatus !== "sufficient") {
    reasonCodes.push("weak_or_insufficient_sample");
    messages.push("Opportunity gap peer sample is not sufficient for a validated launch decision.");
    return result("needs_more_data", reasonCodes, messages, plan.evidenceRefs);
  }

  return result("accept", reasonCodes, ["Experiment plan passed deterministic validation."], plan.evidenceRefs);
}

function checkIdentity(
  context: AgentContextBundle,
  hypothesis: InterventionHypothesis,
  plan: ExperimentPlan,
  reasonCodes: ExperimentValidationReasonCode[],
  messages: string[],
): void {
  const identityFields = ["agentRunId", "brandId", "storeId", "opportunityGapId"] as const;
  for (const field of identityFields) {
    if (hypothesis[field] !== context[field] || plan[field] !== context[field]) {
      reasonCodes.push("identity_mismatch");
      messages.push(`${field} must match the AgentContextBundle.`);
    }
  }
  if (plan.hypothesisId !== hypothesis.hypothesisId) {
    reasonCodes.push("identity_mismatch");
    messages.push("experimentPlan.hypothesisId must match hypothesis.hypothesisId.");
  }
}

function checkTruthBoundary(
  hypothesis: InterventionHypothesis,
  plan: ExperimentPlan,
  reasonCodes: ExperimentValidationReasonCode[],
  messages: string[],
): void {
  if (hypothesis.truthStatus !== "agent_draft_not_core_truth" || plan.truthStatus !== "agent_draft_not_core_truth") {
    reasonCodes.push("agent_draft_not_truth");
    messages.push("Agent output must remain a draft and not Core truth.");
  }
  if (hypothesis.requestedCoreWrites.length !== 0 || plan.requestedCoreWrites.length !== 0) {
    reasonCodes.push("core_write_requested");
    messages.push("Experiment drafts must not request deterministic Core writes.");
  }
}

function checkEvidenceRefs(
  context: AgentContextBundle,
  hypothesis: InterventionHypothesis,
  plan: ExperimentPlan,
  reasonCodes: ExperimentValidationReasonCode[],
  messages: string[],
): void {
  if (hypothesis.evidenceRefs.length === 0 || plan.evidenceRefs.length === 0) {
    reasonCodes.push("missing_evidence_refs");
    messages.push("Hypothesis and experiment plan must include evidenceRefs.");
    return;
  }
  const contextEvidenceRefs = new Set(context.evidenceRefs);
  const allRefs = [...hypothesis.evidenceRefs, ...plan.evidenceRefs, ...plan.measurement.guardrails.flatMap((guardrail) => guardrail.evidenceRefs)];
  const unknownRefs = allRefs.filter((ref) => !contextEvidenceRefs.has(ref));
  if (unknownRefs.length > 0) {
    reasonCodes.push("evidence_refs_not_from_context");
    messages.push("Evidence refs must come from the deterministic AgentContextBundle.");
  }
}

function checkUncertainty(
  hypothesis: InterventionHypothesis,
  plan: ExperimentPlan,
  reasonCodes: ExperimentValidationReasonCode[],
  messages: string[],
): void {
  if (hypothesis.uncertainty.confidence <= 0 || plan.uncertainty.confidence <= 0) {
    reasonCodes.push("missing_uncertainty_or_confidence");
    messages.push("Hypothesis and plan must include positive confidence in uncertainty fields.");
  }
}

function checkSafety(plan: ExperimentPlan, reasonCodes: ExperimentValidationReasonCode[], messages: string[]): void {
  if (!plan.safety.merchantConfirmationRequired) {
    reasonCodes.push("merchant_confirmation_required");
    messages.push("Merchant confirmation is required before any business action.");
  }
  if (!plan.safety.rollbackSupported) {
    reasonCodes.push("rollback_required");
    messages.push("Rollback support is required for this validator boundary.");
  }
  if (plan.measurement.guardrails.length === 0) {
    reasonCodes.push("guardrail_required");
    messages.push("At least one guardrail is required.");
  }
}

function hasBlockingReason(reasonCodes: ExperimentValidationReasonCode[]): boolean {
  return reasonCodes.some((code) => code !== "weak_or_insufficient_sample");
}

function result(
  decision: ExperimentValidationDecision,
  reasonCodes: ExperimentValidationReasonCode[],
  messages: string[],
  evidenceRefs: string[],
): ExperimentValidationResult {
  return ExperimentValidationResultSchema.parse({ decision, reasonCodes: [...new Set(reasonCodes)], messages, evidenceRefs });
}
