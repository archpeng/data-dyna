import { z } from "zod";
import { SnapshotMetricIdSchema } from "../snapshots/independent-cafe-snapshots.ts";
import { AgentDraftTruthStatusSchema } from "./agent-sidecar.ts";
import { AgentContextBundleSchema, type AgentContextBundle } from "./context-bundle.ts";

export const InterventionHypothesisVersionSchema = z.literal("intervention-hypothesis.v1");
export const ExperimentPlanVersionSchema = z.literal("experiment-plan.v1");
export const ExperimentUncertaintyLevelSchema = z.enum(["low", "medium", "high"]);
export const ExperimentPlanStatusSchema = z.literal("draft_for_validation");
export const ExperimentPlanChangeKindSchema = z.enum(["merchant_reviewed_operational_experiment", "merchant_reviewed_customer_experience_experiment"]);

export const ExperimentUncertaintySchema = z.object({
  level: ExperimentUncertaintyLevelSchema,
  confidence: z.number().min(0).max(1),
  assumptions: z.array(z.string().min(1)).min(1),
});

export const InterventionHypothesisSchema = z.object({
  contractVersion: InterventionHypothesisVersionSchema,
  hypothesisId: z.string().min(1),
  agentRunId: z.string().min(1),
  brandId: z.string().min(1),
  storeId: z.string().min(1),
  opportunityGapId: z.string().min(1),
  truthStatus: AgentDraftTruthStatusSchema,
  statement: z.string().min(1),
  rationale: z.string().min(1),
  expectedMetricId: SnapshotMetricIdSchema,
  evidenceRefs: z.array(z.string().min(1)).min(1),
  uncertainty: ExperimentUncertaintySchema,
  requestedCoreWrites: z.array(z.never()).length(0),
});

export const ExperimentGuardrailSchema = z.object({
  metricId: SnapshotMetricIdSchema,
  relation: z.enum(["must_not_degrade", "monitor_only"]),
  evidenceRefs: z.array(z.string().min(1)).min(1),
});

export const ExperimentPlanSchema = z.object({
  contractVersion: ExperimentPlanVersionSchema,
  experimentPlanId: z.string().min(1),
  hypothesisId: z.string().min(1),
  agentRunId: z.string().min(1),
  brandId: z.string().min(1),
  storeId: z.string().min(1),
  opportunityGapId: z.string().min(1),
  status: ExperimentPlanStatusSchema,
  truthStatus: AgentDraftTruthStatusSchema,
  title: z.string().min(1),
  objective: z.string().min(1),
  proposedIntervention: z.object({
    changeKind: ExperimentPlanChangeKindSchema,
    summary: z.string().min(1),
    merchantEditable: z.literal(true),
  }),
  measurement: z.object({
    primaryMetricId: SnapshotMetricIdSchema,
    metricWindow: z.enum(["snapshot", "90d"]),
    guardrails: z.array(ExperimentGuardrailSchema),
    minimumSampleStatusForLaunch: z.literal("sufficient"),
  }),
  safety: z.object({
    merchantConfirmationRequired: z.boolean(),
    rollbackSupported: z.boolean(),
    stopCriteria: z.array(z.string().min(1)).min(1),
  }),
  evidenceRefs: z.array(z.string().min(1)).min(1),
  uncertainty: ExperimentUncertaintySchema,
  requestedCoreWrites: z.array(z.never()).length(0),
});

export type ExperimentUncertainty = z.infer<typeof ExperimentUncertaintySchema>;
export type InterventionHypothesis = z.infer<typeof InterventionHypothesisSchema>;
export type ExperimentPlan = z.infer<typeof ExperimentPlanSchema>;

export type FixtureExperimentPlanDraft = {
  hypothesis: InterventionHypothesis;
  experimentPlan: ExperimentPlan;
};

export function draftFixtureExperimentPlanFromContext(contextInput: AgentContextBundle): FixtureExperimentPlanDraft {
  const context = AgentContextBundleSchema.parse(contextInput);
  const gap = context.facts.opportunityGap;
  const hypothesisId = `intervention_hypothesis:${context.agentRunId}`;
  const guardrailMetricId = gap.metricId === "refund_rate" ? "avg_order_value" : "refund_rate";
  const uncertainty: ExperimentUncertainty = {
    level: gap.confidence >= 0.65 && gap.sampleStatus === "sufficient" ? "medium" : "high",
    confidence: Math.min(gap.confidence, 0.8),
    assumptions: ["Peer benchmark comparison is directional and non-causal.", ...context.assumptions],
  };

  const hypothesis = InterventionHypothesisSchema.parse({
    contractVersion: "intervention-hypothesis.v1",
    hypothesisId,
    agentRunId: context.agentRunId,
    brandId: context.brandId,
    storeId: context.storeId,
    opportunityGapId: context.opportunityGapId,
    truthStatus: "agent_draft_not_core_truth",
    statement: `A merchant-reviewed operating experiment may reduce the ${gap.metricId} gap for this independent café.`,
    rationale: "The draft uses deterministic opportunity gap facts and aggregate peer evidence only; it does not assert causality.",
    expectedMetricId: gap.metricId,
    evidenceRefs: context.evidenceRefs,
    uncertainty,
    requestedCoreWrites: [],
  });

  const experimentPlan = ExperimentPlanSchema.parse({
    contractVersion: "experiment-plan.v1",
    experimentPlanId: `experiment_plan:${context.agentRunId}`,
    hypothesisId,
    agentRunId: context.agentRunId,
    brandId: context.brandId,
    storeId: context.storeId,
    opportunityGapId: context.opportunityGapId,
    status: "draft_for_validation",
    truthStatus: "agent_draft_not_core_truth",
    title: `Merchant-reviewed ${gap.metricId} experiment`,
    objective: `Improve ${gap.metricId} while preserving guardrails and explicit merchant control.`,
    proposedIntervention: {
      changeKind: "merchant_reviewed_operational_experiment",
      summary: "Draft a reversible in-store operating experiment for merchant review; do not directly change menu, price, coupon, or customer messaging systems.",
      merchantEditable: true,
    },
    measurement: {
      primaryMetricId: gap.metricId,
      metricWindow: gap.metricWindow,
      guardrails: [{ metricId: guardrailMetricId, relation: "must_not_degrade", evidenceRefs: context.evidenceRefs }],
      minimumSampleStatusForLaunch: "sufficient",
    },
    safety: {
      merchantConfirmationRequired: true,
      rollbackSupported: true,
      stopCriteria: ["Stop if the guardrail metric degrades or merchant rejects the proposed experiment."],
    },
    evidenceRefs: context.evidenceRefs,
    uncertainty,
    requestedCoreWrites: [],
  });

  return { hypothesis, experimentPlan };
}
