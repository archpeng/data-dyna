import { z } from "zod";
import { type JsonValue } from "../contracts/event-contract.ts";
import {
  submitExperimentPlanForMerchantReview,
  type MerchantReviewActor,
  type MerchantReviewSubmission,
} from "../merchant-review/experiment-review.ts";
import {
  AgentContextBundleSchema,
  type AgentContextBundle,
} from "./context-bundle.ts";
import {
  AgentRunEventSchema,
  AgentRunSchema,
  type AgentRun,
  type AgentRunAuditStore,
  type AgentRunEvent,
} from "./agent-sidecar.ts";
import {
  ExperimentPlanSchema,
  InterventionHypothesisSchema,
  type ExperimentPlan,
  type ExperimentUncertainty,
  type InterventionHypothesis,
} from "./experiment-plan.ts";
import {
  ExperimentValidationResultSchema,
  validateExperimentPlan,
  type ExperimentValidationResult,
} from "./experiment-validator.ts";

export const AgentResultGateDecisionSchema = z.enum(["accept", "block", "needs_more_data"]);
export const AgentResultBoundaryStatusSchema = z.enum(["validated_for_review_request", "blocked", "needs_more_data"]);

export type AgentDraftArtifacts = {
  hypothesis: InterventionHypothesis;
  experimentPlan: ExperimentPlan;
};

export type AgentDraftResultGate = {
  status: z.infer<typeof AgentResultBoundaryStatusSchema>;
  validationResult: ExperimentValidationResult;
  artifacts?: AgentDraftArtifacts;
};

export type AgentMerchantReviewRequest = {
  gate: AgentDraftResultGate & { status: "validated_for_review_request"; artifacts: AgentDraftArtifacts };
  submission: MerchantReviewSubmission;
};

export async function evaluateAgentDraftResultGate(input: {
  run: AgentRun;
  context: AgentContextBundle;
  auditStore: AgentRunAuditStore;
  now?: () => string;
}): Promise<AgentDraftResultGate> {
  const run = AgentRunSchema.parse(input.run);
  const context = AgentContextBundleSchema.parse(input.context);
  const now = input.now ?? (() => new Date().toISOString());
  assertCapturedDraft(run);

  let artifacts: AgentDraftArtifacts | undefined;
  let validationResult: ExperimentValidationResult;
  try {
    artifacts = buildAgentDraftArtifacts({ run, context });
    validationResult = validateExperimentPlan({
      context,
      hypothesis: artifacts.hypothesis,
      experimentPlan: artifacts.experimentPlan,
    });
  } catch {
    validationResult = ExperimentValidationResultSchema.parse({
      decision: "block",
      reasonCodes: ["schema_invalid"],
      messages: ["Agent draft did not satisfy deterministic result artifact schemas."],
      evidenceRefs: context.evidenceRefs,
    });
  }

  await appendResultEvent(input.auditStore, run, "draft_validation_evaluated", now(), {
    decision: validationResult.decision,
    reasonCodes: validationResult.reasonCodes,
    evidenceRefCount: validationResult.evidenceRefs.length,
    truthStatus: run.draft?.truthStatus ?? "missing",
  });

  return {
    status: statusForValidation(validationResult),
    validationResult,
    artifacts,
  };
}

export async function requestMerchantReviewForAgentDraft(input: {
  run: AgentRun;
  context: AgentContextBundle;
  auditStore: AgentRunAuditStore;
  reviewId: string;
  submittedAt: string;
  submittedBy?: MerchantReviewActor;
  now?: () => string;
}): Promise<AgentMerchantReviewRequest> {
  const gate = await evaluateAgentDraftResultGate(input);
  if (gate.status !== "validated_for_review_request" || !gate.artifacts) {
    throw new Error("Agent draft cannot request merchant review without an accepted deterministic result gate.");
  }

  const submission = submitExperimentPlanForMerchantReview({
    reviewId: input.reviewId,
    experimentPlan: gate.artifacts.experimentPlan,
    validationResult: gate.validationResult,
    submittedAt: input.submittedAt,
    submittedBy: input.submittedBy,
  });

  const now = input.now ?? (() => new Date().toISOString());
  await appendResultEvent(input.auditStore, input.run, "merchant_review_requested", now(), {
    reviewId: submission.reviewId,
    reviewStatus: submission.reviewStatus,
    lifecycleState: submission.lifecycleState,
    evidenceRefCount: submission.evidenceRefs.length,
    merchantApprovalImplied: false,
    businessMutationCalled: false,
  });

  return {
    gate: { ...gate, status: "validated_for_review_request", artifacts: gate.artifacts },
    submission,
  };
}

export function buildAgentDraftArtifacts(input: { run: AgentRun; context: AgentContextBundle }): AgentDraftArtifacts {
  const run = AgentRunSchema.parse(input.run);
  const context = AgentContextBundleSchema.parse(input.context);
  assertCapturedDraft(run);
  if (run.agentRunId !== context.agentRunId || run.brandId !== context.brandId || run.storeId !== context.storeId || run.opportunityGapId !== context.opportunityGapId) {
    throw new Error("Agent run and context bundle identity must match before result validation.");
  }

  const draft = run.draft;
  const uncertainty: ExperimentUncertainty = {
    level: context.facts.opportunityGap.confidence >= 0.65 && context.facts.opportunityGap.sampleStatus === "sufficient" ? "medium" : "high",
    confidence: Math.min(context.facts.opportunityGap.confidence, 0.8),
    assumptions: [draft.reasoningSummary, ...context.assumptions],
  };
  const hypothesisId = `intervention_hypothesis:${run.agentRunId}`;
  const evidenceRefs = [...new Set(draft.evidenceRefs)].sort((left, right) => left.localeCompare(right));

  const hypothesis = InterventionHypothesisSchema.parse({
    contractVersion: "intervention-hypothesis.v1",
    hypothesisId,
    agentRunId: run.agentRunId,
    brandId: run.brandId,
    storeId: run.storeId,
    opportunityGapId: run.opportunityGapId,
    truthStatus: "agent_draft_not_core_truth",
    statement: draft.hypothesis,
    rationale: draft.reasoningSummary,
    expectedMetricId: draft.draftExperimentPlan.measurementMetricId,
    evidenceRefs,
    uncertainty,
    requestedCoreWrites: [],
  });

  const experimentPlan = ExperimentPlanSchema.parse({
    contractVersion: "experiment-plan.v1",
    experimentPlanId: `experiment_plan:${run.agentRunId}`,
    hypothesisId,
    agentRunId: run.agentRunId,
    brandId: run.brandId,
    storeId: run.storeId,
    opportunityGapId: run.opportunityGapId,
    status: "draft_for_validation",
    truthStatus: "agent_draft_not_core_truth",
    title: `Merchant-reviewed ${draft.draftExperimentPlan.measurementMetricId} experiment`,
    objective: draft.draftExperimentPlan.objective,
    proposedIntervention: {
      changeKind: "merchant_reviewed_operational_experiment",
      summary: draft.hypothesis,
      merchantEditable: true,
    },
    measurement: {
      primaryMetricId: draft.draftExperimentPlan.measurementMetricId,
      metricWindow: context.facts.opportunityGap.metricWindow,
      guardrails: draft.draftExperimentPlan.guardrailMetricIds.map((metricId) => ({
        metricId,
        relation: "must_not_degrade",
        evidenceRefs,
      })),
      minimumSampleStatusForLaunch: "sufficient",
    },
    safety: {
      merchantConfirmationRequired: draft.draftExperimentPlan.merchantReviewRequired,
      rollbackSupported: true,
      stopCriteria: ["Stop if guardrails degrade or the merchant rejects the draft experiment."],
    },
    evidenceRefs,
    uncertainty,
    requestedCoreWrites: [],
  });

  return { hypothesis, experimentPlan };
}

function assertCapturedDraft(run: AgentRun): asserts run is AgentRun & { draft: NonNullable<AgentRun["draft"]> } {
  if (run.status !== "draft_captured" || !run.draft) {
    throw new Error("Merchant-review result gates require a captured Agent draft.");
  }
  if (run.draft.truthStatus !== "agent_draft_not_core_truth") {
    throw new Error("Agent result gate received a draft promoted beyond draft truth status.");
  }
  if (run.draft.requestedCoreWrites.length !== 0) {
    throw new Error("Agent result gate received a draft with requested Core writes.");
  }
}

function statusForValidation(validationResult: ExperimentValidationResult): AgentDraftResultGate["status"] {
  if (validationResult.decision === "accept") return "validated_for_review_request";
  if (validationResult.decision === "needs_more_data") return "needs_more_data";
  return "blocked";
}

async function appendResultEvent(
  store: AgentRunAuditStore,
  runInput: AgentRun,
  eventType: "draft_validation_evaluated" | "merchant_review_requested",
  occurredAt: string,
  metadata: Record<string, JsonValue>,
): Promise<void> {
  const run = AgentRunSchema.parse(runInput);
  const event = AgentRunEventSchema.parse({
    agentRunEventId: `agent_run_event:${run.agentRunId}:${eventType}:${occurredAt}`,
    agentRunId: run.agentRunId,
    sessionId: run.sessionId,
    storeId: run.storeId,
    opportunityGapId: run.opportunityGapId,
    eventType,
    occurredAt,
    metadata,
  });
  await store.appendEvent(event);
}
