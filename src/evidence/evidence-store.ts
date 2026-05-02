import { z } from "zod";
import { ExperimentGuardrailSchema, ExperimentPlanSchema, type ExperimentPlan } from "../agent/experiment-plan.ts";
import { type OpportunityGap } from "../benchmarks/opportunity-gaps.ts";
import { type ActionLifecycleRecord, type MerchantReviewAcceptance } from "../merchant-review/experiment-review.ts";
import { SnapshotMetricIdSchema, type MetricSnapshot } from "../snapshots/independent-cafe-snapshots.ts";

export const EvidenceStoreContractVersionSchema = z.literal("evidence-store.v1");
export const EvidenceSampleStatusSchema = z.enum(["sufficient", "weak_sample", "needs_more_data"]);
export const EvidenceConfidenceLabelSchema = z.enum(["medium", "low", "needs_more_data"]);
export const MetricDirectionSchema = z.enum(["higher_is_better", "lower_is_better"]);
export const MetricEffectOutcomeSchema = z.enum(["improved", "unchanged", "degraded", "needs_more_data"]);
export const GuardrailOutcomeSchema = z.enum(["passed", "degraded", "observed", "needs_more_data"]);
export const EvidenceVerdictSchema = z.enum(["clean_success", "mixed_guardrail_degraded", "no_clear_lift", "needs_more_data"]);
export const EvidenceInterpretationSchema = z.enum(["directional_before_after_non_causal", "needs_more_data_missing_or_weak_sample"]);

export type EvidenceSampleStatus = z.infer<typeof EvidenceSampleStatusSchema>;
export type EvidenceConfidenceLabel = z.infer<typeof EvidenceConfidenceLabelSchema>;
export type MetricDirection = z.infer<typeof MetricDirectionSchema>;
export type MetricEffectOutcome = z.infer<typeof MetricEffectOutcomeSchema>;
export type GuardrailOutcome = z.infer<typeof GuardrailOutcomeSchema>;
export type EvidenceVerdict = z.infer<typeof EvidenceVerdictSchema>;
export type EvidenceInterpretation = z.infer<typeof EvidenceInterpretationSchema>;

const ActionEffectBaseSchema = z.object({
  contractVersion: EvidenceStoreContractVersionSchema,
  actionEffectId: z.string().min(1),
  experimentPlanId: z.string().min(1),
  brandId: z.string().min(1),
  storeId: z.string().min(1),
  metricId: SnapshotMetricIdSchema,
  beforeMetricSnapshotId: z.string().min(1),
  afterMetricSnapshotId: z.string().min(1),
  beforeValue: z.number().nullable(),
  afterValue: z.number().nullable(),
  deltaValue: z.number().nullable(),
  deltaRatio: z.number().nullable(),
  direction: MetricDirectionSchema,
  sampleStatus: EvidenceSampleStatusSchema,
  confidenceLabel: EvidenceConfidenceLabelSchema,
  outcome: MetricEffectOutcomeSchema,
  interpretation: EvidenceInterpretationSchema,
  evidenceRefs: z.array(z.string().min(1)).min(1),
});

export const ActionEffectSchema = ActionEffectBaseSchema.superRefine((effect, ctx) => {
  if (effect.sampleStatus === "needs_more_data" && effect.outcome !== "needs_more_data") {
    ctx.addIssue({ code: "custom", path: ["outcome"], message: "needs_more_data samples must not produce a metric outcome." });
  }
  if (effect.sampleStatus !== "needs_more_data" && effect.deltaValue === null) {
    ctx.addIssue({ code: "custom", path: ["deltaValue"], message: "measurable effects require deterministic value deltas; deltaRatio may be null when baseline is zero." });
  }
});

export const GuardrailResultSchema = z.object({
  contractVersion: EvidenceStoreContractVersionSchema,
  guardrailResultId: z.string().min(1),
  experimentPlanId: z.string().min(1),
  brandId: z.string().min(1),
  storeId: z.string().min(1),
  metricId: SnapshotMetricIdSchema,
  relation: z.enum(["must_not_degrade", "monitor_only"]),
  beforeMetricSnapshotId: z.string().min(1),
  afterMetricSnapshotId: z.string().min(1),
  beforeValue: z.number().nullable(),
  afterValue: z.number().nullable(),
  deltaValue: z.number().nullable(),
  direction: MetricDirectionSchema,
  sampleStatus: EvidenceSampleStatusSchema,
  confidenceLabel: EvidenceConfidenceLabelSchema,
  outcome: GuardrailOutcomeSchema,
  interpretation: EvidenceInterpretationSchema,
  evidenceRefs: z.array(z.string().min(1)).min(1),
});

export const InterventionTrajectorySchema = z.object({
  contractVersion: EvidenceStoreContractVersionSchema,
  interventionTrajectoryId: z.string().min(1),
  experimentPlanId: z.string().min(1),
  reviewId: z.string().min(1),
  acceptanceDecisionId: z.string().min(1),
  appliedLifecycleRecordId: z.string().min(1),
  brandId: z.string().min(1),
  storeId: z.string().min(1),
  primaryActionEffectId: z.string().min(1),
  guardrailResultIds: z.array(z.string().min(1)),
  adoptionRefs: z.array(z.string().min(1)).min(1),
  overallVerdict: EvidenceVerdictSchema,
  interpretation: EvidenceInterpretationSchema,
  evidenceRefs: z.array(z.string().min(1)).min(1),
}).superRefine((trajectory, ctx) => {
  if (!trajectory.adoptionRefs.includes(trajectory.appliedLifecycleRecordId)) {
    ctx.addIssue({ code: "custom", path: ["adoptionRefs"], message: "Evidence trajectories must include merchant adoption refs." });
  }
});

export const EvidenceRecordSchema = z.object({
  contractVersion: EvidenceStoreContractVersionSchema,
  evidenceRecordId: z.string().min(1),
  interventionTrajectoryId: z.string().min(1),
  segmentRef: z.string().min(1),
  opportunityGapId: z.string().min(1),
  experimentPlanId: z.string().min(1),
  outcomeRef: z.string().min(1),
  guardrailRefs: z.array(z.string().min(1)),
  adoptionRefs: z.array(z.string().min(1)).min(1),
  verdict: EvidenceVerdictSchema,
  interpretation: EvidenceInterpretationSchema,
  evidenceRefs: z.array(z.string().min(1)).min(1),
  reproducibleInputRefs: z.array(z.string().min(1)).min(1),
  llmGeneratedClaims: z.array(z.never()).length(0),
});

export type ActionEffect = z.infer<typeof ActionEffectSchema>;
export type GuardrailResult = z.infer<typeof GuardrailResultSchema>;
export type InterventionTrajectory = z.infer<typeof InterventionTrajectorySchema>;
export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;

export function reviewActionEffect(input: {
  actionEffectId: string;
  experimentPlan: ExperimentPlan;
  beforeMetricSnapshot: MetricSnapshot;
  afterMetricSnapshot: MetricSnapshot;
  minDenominator?: number;
}): ActionEffect {
  const plan = ExperimentPlanSchema.parse(input.experimentPlan);
  assertMetricPair(plan, plan.measurement.primaryMetricId, input.beforeMetricSnapshot, input.afterMetricSnapshot);
  const direction = directionFor(input.beforeMetricSnapshot.definition.guardrailRelation);
  const sampleStatus = sampleStatusFor(input.beforeMetricSnapshot, input.afterMetricSnapshot, input.minDenominator);
  const deltaValue = measurable(sampleStatus, input.beforeMetricSnapshot, input.afterMetricSnapshot) ? roundMetric((input.afterMetricSnapshot.value as number) - (input.beforeMetricSnapshot.value as number)) : null;
  const deltaRatio = deltaValue === null || input.beforeMetricSnapshot.value === null || input.beforeMetricSnapshot.value === 0 ? null : roundMetric(deltaValue / Math.abs(input.beforeMetricSnapshot.value));
  return ActionEffectSchema.parse({
    contractVersion: "evidence-store.v1",
    actionEffectId: input.actionEffectId,
    experimentPlanId: plan.experimentPlanId,
    brandId: plan.brandId,
    storeId: plan.storeId,
    metricId: plan.measurement.primaryMetricId,
    beforeMetricSnapshotId: input.beforeMetricSnapshot.metricSnapshotId,
    afterMetricSnapshotId: input.afterMetricSnapshot.metricSnapshotId,
    beforeValue: input.beforeMetricSnapshot.value,
    afterValue: input.afterMetricSnapshot.value,
    deltaValue,
    deltaRatio,
    direction,
    sampleStatus,
    confidenceLabel: confidenceLabelFor(sampleStatus),
    outcome: outcomeFor(deltaValue, direction, sampleStatus),
    interpretation: interpretationFor(sampleStatus),
    evidenceRefs: uniqueSorted([
      input.beforeMetricSnapshot.metricSnapshotId,
      input.afterMetricSnapshot.metricSnapshotId,
      ...input.beforeMetricSnapshot.evidenceRefs,
      ...input.afterMetricSnapshot.evidenceRefs,
      ...plan.evidenceRefs,
    ]),
  });
}

export function reviewGuardrailResult(input: {
  guardrailResultId: string;
  experimentPlan: ExperimentPlan;
  guardrail: z.infer<typeof ExperimentGuardrailSchema>;
  beforeMetricSnapshot?: MetricSnapshot;
  afterMetricSnapshot?: MetricSnapshot;
  minDenominator?: number;
}): GuardrailResult {
  const plan = ExperimentPlanSchema.parse(input.experimentPlan);
  if (!input.beforeMetricSnapshot || !input.afterMetricSnapshot) {
    return GuardrailResultSchema.parse({
      contractVersion: "evidence-store.v1",
      guardrailResultId: input.guardrailResultId,
      experimentPlanId: plan.experimentPlanId,
      brandId: plan.brandId,
      storeId: plan.storeId,
      metricId: input.guardrail.metricId,
      relation: input.guardrail.relation,
      beforeMetricSnapshotId: `missing_before:${input.guardrail.metricId}`,
      afterMetricSnapshotId: `missing_after:${input.guardrail.metricId}`,
      beforeValue: null,
      afterValue: null,
      deltaValue: null,
      direction: "higher_is_better",
      sampleStatus: "needs_more_data",
      confidenceLabel: "needs_more_data",
      outcome: "needs_more_data",
      interpretation: "needs_more_data_missing_or_weak_sample",
      evidenceRefs: uniqueSorted([...input.guardrail.evidenceRefs, ...plan.evidenceRefs]),
    });
  }
  assertMetricPair(plan, input.guardrail.metricId, input.beforeMetricSnapshot, input.afterMetricSnapshot);
  const direction = directionFor(input.beforeMetricSnapshot.definition.guardrailRelation);
  const sampleStatus = sampleStatusFor(input.beforeMetricSnapshot, input.afterMetricSnapshot, input.minDenominator);
  const deltaValue = measurable(sampleStatus, input.beforeMetricSnapshot, input.afterMetricSnapshot) ? roundMetric((input.afterMetricSnapshot.value as number) - (input.beforeMetricSnapshot.value as number)) : null;
  const degradation = deltaValue === null ? false : outcomeFor(deltaValue, direction, sampleStatus) === "degraded";
  const outcome: GuardrailOutcome = sampleStatus === "needs_more_data" ? "needs_more_data" : input.guardrail.relation === "monitor_only" ? "observed" : degradation ? "degraded" : "passed";
  return GuardrailResultSchema.parse({
    contractVersion: "evidence-store.v1",
    guardrailResultId: input.guardrailResultId,
    experimentPlanId: plan.experimentPlanId,
    brandId: plan.brandId,
    storeId: plan.storeId,
    metricId: input.guardrail.metricId,
    relation: input.guardrail.relation,
    beforeMetricSnapshotId: input.beforeMetricSnapshot.metricSnapshotId,
    afterMetricSnapshotId: input.afterMetricSnapshot.metricSnapshotId,
    beforeValue: input.beforeMetricSnapshot.value,
    afterValue: input.afterMetricSnapshot.value,
    deltaValue,
    direction,
    sampleStatus,
    confidenceLabel: confidenceLabelFor(sampleStatus),
    outcome,
    interpretation: interpretationFor(sampleStatus),
    evidenceRefs: uniqueSorted([
      input.beforeMetricSnapshot.metricSnapshotId,
      input.afterMetricSnapshot.metricSnapshotId,
      ...input.beforeMetricSnapshot.evidenceRefs,
      ...input.afterMetricSnapshot.evidenceRefs,
      ...input.guardrail.evidenceRefs,
      ...plan.evidenceRefs,
    ]),
  });
}

export function assembleInterventionTrajectory(input: {
  interventionTrajectoryId: string;
  experimentPlan: ExperimentPlan;
  acceptance: MerchantReviewAcceptance;
  appliedLifecycleRecord: ActionLifecycleRecord;
  actionEffect: ActionEffect;
  guardrailResults: GuardrailResult[];
}): InterventionTrajectory {
  const plan = ExperimentPlanSchema.parse(input.experimentPlan);
  if (input.acceptance.experimentPlanId !== plan.experimentPlanId || input.appliedLifecycleRecord.experimentPlanId !== plan.experimentPlanId) {
    throw new Error("Trajectory inputs must reference the same experiment plan.");
  }
  if (input.appliedLifecycleRecord.toState !== "applied") {
    throw new Error("Intervention trajectory requires an applied merchant lifecycle record.");
  }
  if (input.actionEffect.experimentPlanId !== plan.experimentPlanId || input.actionEffect.brandId !== plan.brandId || input.actionEffect.storeId !== plan.storeId) {
    throw new Error("Action effect must reference the same experiment plan and store as the trajectory.");
  }
  if (input.actionEffect.metricId !== plan.measurement.primaryMetricId) {
    throw new Error("Action effect must measure the experiment primary metric.");
  }
  for (const guardrailResult of input.guardrailResults) {
    if (guardrailResult.experimentPlanId !== plan.experimentPlanId || guardrailResult.brandId !== plan.brandId || guardrailResult.storeId !== plan.storeId) {
      throw new Error("Guardrail results must reference the same experiment plan and store as the trajectory.");
    }
  }
  const overallVerdict = verdictFor(input.actionEffect, input.guardrailResults);
  return InterventionTrajectorySchema.parse({
    contractVersion: "evidence-store.v1",
    interventionTrajectoryId: input.interventionTrajectoryId,
    experimentPlanId: plan.experimentPlanId,
    reviewId: input.acceptance.reviewId,
    acceptanceDecisionId: input.acceptance.decisionId,
    appliedLifecycleRecordId: input.appliedLifecycleRecord.lifecycleRecordId,
    brandId: plan.brandId,
    storeId: plan.storeId,
    primaryActionEffectId: input.actionEffect.actionEffectId,
    guardrailResultIds: input.guardrailResults.map((result) => result.guardrailResultId).sort(compareStrings),
    adoptionRefs: [input.acceptance.decisionId, input.appliedLifecycleRecord.lifecycleRecordId].sort(compareStrings),
    overallVerdict,
    interpretation: overallVerdict === "needs_more_data" ? "needs_more_data_missing_or_weak_sample" : "directional_before_after_non_causal",
    evidenceRefs: uniqueSorted([
      plan.experimentPlanId,
      input.acceptance.decisionId,
      input.appliedLifecycleRecord.lifecycleRecordId,
      input.actionEffect.actionEffectId,
      ...input.actionEffect.evidenceRefs,
      ...input.guardrailResults.flatMap((result) => [result.guardrailResultId, ...result.evidenceRefs]),
      ...input.appliedLifecycleRecord.evidenceRefs,
    ]),
  });
}

export function buildEvidenceRecord(input: {
  evidenceRecordId: string;
  trajectory: InterventionTrajectory;
  opportunityGap: OpportunityGap;
  actionEffect: ActionEffect;
  guardrailResults: GuardrailResult[];
}): EvidenceRecord {
  assertEvidenceRecordInputs(input);
  const reproducibleInputRefs = uniqueSorted([
    input.opportunityGap.segmentCandidateId,
    input.opportunityGap.opportunityGapId,
    input.trajectory.experimentPlanId,
    input.actionEffect.actionEffectId,
    ...input.guardrailResults.map((result) => result.guardrailResultId),
    ...input.trajectory.adoptionRefs,
  ]);
  return EvidenceRecordSchema.parse({
    contractVersion: "evidence-store.v1",
    evidenceRecordId: input.evidenceRecordId,
    interventionTrajectoryId: input.trajectory.interventionTrajectoryId,
    segmentRef: input.opportunityGap.segmentCandidateId,
    opportunityGapId: input.opportunityGap.opportunityGapId,
    experimentPlanId: input.trajectory.experimentPlanId,
    outcomeRef: input.actionEffect.actionEffectId,
    guardrailRefs: input.guardrailResults.map((result) => result.guardrailResultId).sort(compareStrings),
    adoptionRefs: input.trajectory.adoptionRefs,
    verdict: input.trajectory.overallVerdict,
    interpretation: input.trajectory.interpretation,
    evidenceRefs: uniqueSorted([
      input.trajectory.interventionTrajectoryId,
      ...input.trajectory.evidenceRefs,
      input.opportunityGap.opportunityGapId,
      ...input.opportunityGap.evidenceRefs,
      ...reproducibleInputRefs,
    ]),
    reproducibleInputRefs,
    llmGeneratedClaims: [],
  });
}

function assertEvidenceRecordInputs(input: {
  trajectory: InterventionTrajectory;
  opportunityGap: OpportunityGap;
  actionEffect: ActionEffect;
  guardrailResults: GuardrailResult[];
}): void {
  if (input.trajectory.experimentPlanId !== input.actionEffect.experimentPlanId || input.trajectory.primaryActionEffectId !== input.actionEffect.actionEffectId) {
    throw new Error("Evidence record action effect must match the intervention trajectory primary effect.");
  }
  if (input.opportunityGap.brandId !== input.actionEffect.brandId || input.opportunityGap.storeId !== input.actionEffect.storeId) {
    throw new Error("Evidence record opportunity gap must belong to the measured store.");
  }
  const trajectoryGuardrailIds = uniqueSorted(input.trajectory.guardrailResultIds);
  const inputGuardrailIds = uniqueSorted(input.guardrailResults.map((result) => result.guardrailResultId));
  if (trajectoryGuardrailIds.join("\n") !== inputGuardrailIds.join("\n")) {
    throw new Error("Evidence record guardrail results must match the intervention trajectory guardrails.");
  }
  for (const guardrailResult of input.guardrailResults) {
    if (guardrailResult.experimentPlanId !== input.trajectory.experimentPlanId || guardrailResult.brandId !== input.actionEffect.brandId || guardrailResult.storeId !== input.actionEffect.storeId) {
      throw new Error("Evidence record guardrail results must belong to the same experiment plan and store.");
    }
  }
}

function assertMetricPair(plan: ExperimentPlan, metricId: z.infer<typeof SnapshotMetricIdSchema>, before: MetricSnapshot, after: MetricSnapshot): void {
  if (before.brandId !== plan.brandId || after.brandId !== plan.brandId || before.storeId !== plan.storeId || after.storeId !== plan.storeId) {
    throw new Error("Metric snapshots must belong to the experiment plan store.");
  }
  if (before.definition.metricId !== metricId || after.definition.metricId !== metricId) {
    throw new Error("Metric snapshots must match the requested experiment metric.");
  }
}

function directionFor(relation: MetricSnapshot["definition"]["guardrailRelation"]): MetricDirection {
  return relation === "negative_guardrail" ? "lower_is_better" : "higher_is_better";
}

function sampleStatusFor(before: MetricSnapshot, after: MetricSnapshot, minDenominator = 10): EvidenceSampleStatus {
  if (before.value === null || after.value === null || before.denominatorValue === 0 || after.denominatorValue === 0) return "needs_more_data";
  if (before.denominatorValue < minDenominator || after.denominatorValue < minDenominator) return "weak_sample";
  return "sufficient";
}

function measurable(sampleStatus: EvidenceSampleStatus, before: MetricSnapshot, after: MetricSnapshot): boolean {
  return sampleStatus !== "needs_more_data" && before.value !== null && after.value !== null;
}

function confidenceLabelFor(sampleStatus: EvidenceSampleStatus): EvidenceConfidenceLabel {
  if (sampleStatus === "sufficient") return "medium";
  if (sampleStatus === "weak_sample") return "low";
  return "needs_more_data";
}

function interpretationFor(sampleStatus: EvidenceSampleStatus): EvidenceInterpretation {
  return sampleStatus === "sufficient" ? "directional_before_after_non_causal" : "needs_more_data_missing_or_weak_sample";
}

function outcomeFor(deltaValue: number | null, direction: MetricDirection, sampleStatus: EvidenceSampleStatus): MetricEffectOutcome {
  if (sampleStatus === "needs_more_data" || deltaValue === null) return "needs_more_data";
  if (deltaValue === 0) return "unchanged";
  const improved = direction === "higher_is_better" ? deltaValue > 0 : deltaValue < 0;
  return improved ? "improved" : "degraded";
}

function verdictFor(actionEffect: ActionEffect, guardrailResults: GuardrailResult[]): EvidenceVerdict {
  if (actionEffect.outcome === "needs_more_data" || guardrailResults.some((result) => result.outcome === "needs_more_data")) return "needs_more_data";
  if (guardrailResults.some((result) => result.outcome === "degraded")) return "mixed_guardrail_degraded";
  if (actionEffect.outcome === "improved") return "clean_success";
  return "no_clear_lift";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort(compareStrings);
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right);
}

function roundMetric(value: number): number {
  return Math.round(value * 10000) / 10000;
}
