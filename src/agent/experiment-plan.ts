import { z } from "zod";
import { SnapshotMetricIdSchema } from "../snapshots/independent-cafe-snapshots.ts";
import { AgentDraftTruthStatusSchema } from "./agent-sidecar.ts";

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
