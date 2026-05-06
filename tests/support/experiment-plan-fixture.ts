import {
  ExperimentPlanSchema,
  InterventionHypothesisSchema,
  type ExperimentPlan,
  type ExperimentUncertainty,
  type InterventionHypothesis,
} from "../../src/agent/experiment-plan.ts";
import { AgentContextBundleSchema, type AgentContextBundle } from "../../src/agent/context-bundle.ts";

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
