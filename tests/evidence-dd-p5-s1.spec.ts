import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { OpportunityGap } from "../src/benchmarks/opportunity-gaps.ts";
import { buildAgentContextBundle } from "../src/agent/context-bundle.ts";
import { validateExperimentPlan } from "../src/agent/experiment-validator.ts";
import { draftFixtureExperimentPlanFromContext } from "./support/experiment-plan-fixture.ts";
import type { MetricSnapshot } from "../src/snapshots/independent-cafe-snapshots.ts";
import {
  acceptExperimentReview,
  recordActionLifecycleTransition,
  submitExperimentPlanForMerchantReview,
} from "../src/merchant-review/experiment-review.ts";
import {
  buildEvidenceRecord,
  reviewActionEffect,
  reviewGuardrailResult,
  assembleInterventionTrajectory,
} from "../src/evidence/evidence-store.ts";

const opportunityGap: OpportunityGap = {
  opportunityGapId: "opportunity_gap:brand-1:store-target:2026-05-02:avg_order_value",
  brandId: "brand-1",
  storeId: "store-target",
  snapshotDate: "2026-05-02",
  segmentCandidateId: "restaurant_segment:brand-1:store-target:2026-05-02:independent_cafe_core",
  segmentLabel: "independent_cafe_core",
  metricId: "avg_order_value",
  metricWindow: "snapshot",
  guardrailRelation: "growth_metric",
  targetValue: 50,
  peerMedianValue: 60,
  peerP75Value: 70,
  comparisonBasis: "peer_p75",
  direction: "higher_is_better",
  gapValue: 20,
  gapRatio: 0.2857,
  rank: 1,
  confidence: 0.7,
  sampleStatus: "sufficient",
  interpretation: "directional_non_causal_gap",
  evidenceRefs: [
    "metric:brand-1:store-target:2026-05-02:avg_order_value",
    "peer_benchmark:2026-05-02:independent_cafe_core:avg_order_value:snapshot",
    "peer_group:2026-05-02:independent_cafe_core:avg_order_value:snapshot",
    "restaurant_segment:brand-1:store-target:2026-05-02:independent_cafe_core",
  ],
};
const context = buildAgentContextBundle({
  agentRunId: "agent_run:brand-1:store-target:gap-aov:dd-p5-s1",
  sessionId: "agent_session:brand-1:store-target:gap-aov",
  opportunityGap,
  createdAt: "2026-05-02T00:00:00.000Z",
});
const draft = draftFixtureExperimentPlanFromContext(context);
const validation = validateExperimentPlan({ context, hypothesis: draft.hypothesis, experimentPlan: draft.experimentPlan });
assert.equal(validation.decision, "accept");

const submission = submitExperimentPlanForMerchantReview({
  reviewId: "experiment_review:brand-1:store-target:plan-aov:dd-p5-s1",
  experimentPlan: draft.experimentPlan,
  validationResult: validation,
  submittedAt: "2026-05-02T01:00:00.000Z",
});
const merchantActor = { actorType: "merchant" as const, actorId: "merchant-1", displayName: "Cafe owner" };
const acceptance = acceptExperimentReview({
  submission,
  decisionId: "experiment_review_decision:accept:dd-p5-s1",
  decidedAt: "2026-05-02T01:10:00.000Z",
  actor: merchantActor,
});
const applied = recordActionLifecycleTransition({
  lifecycleRecordId: "experiment_lifecycle:apply:dd-p5-s1",
  reviewId: submission.reviewId,
  experimentPlanId: submission.experimentPlanId,
  brandId: submission.brandId,
  storeId: submission.storeId,
  eventName: "mobile_hq.experiment_applied_recorded",
  occurredAt: "2026-05-02T02:00:00.000Z",
  actor: merchantActor,
  fromState: "accepted",
  toState: "applied",
  acceptanceDecisionId: acceptance.decisionId,
  rollbackRef: "rollback_contract:weekday-morning-aov:dd-p5-s1",
  evidenceRefs: submission.evidenceRefs,
});

const beforeAov = metric("avg_order_value", "2026-05-01", 5000, 100, "growth_metric");
const afterAov = metric("avg_order_value", "2026-05-08", 6200, 100, "growth_metric");
const actionEffect = reviewActionEffect({
  actionEffectId: "action_effect:plan-aov:avg_order_value",
  experimentPlan: draft.experimentPlan,
  beforeMetricSnapshot: beforeAov,
  afterMetricSnapshot: afterAov,
});
assert.equal(actionEffect.outcome, "improved");
assert.equal(actionEffect.sampleStatus, "sufficient");
assert.equal(actionEffect.interpretation, "directional_before_after_non_causal");
assert.equal(actionEffect.deltaValue, 12);

const zeroBaselineEffect = reviewActionEffect({
  actionEffectId: "action_effect:plan-aov:zero_baseline",
  experimentPlan: draft.experimentPlan,
  beforeMetricSnapshot: metric("avg_order_value", "2026-05-01", 0, 100, "growth_metric"),
  afterMetricSnapshot: metric("avg_order_value", "2026-05-08", 1200, 100, "growth_metric"),
});
assert.equal(zeroBaselineEffect.outcome, "improved");
assert.equal(zeroBaselineEffect.deltaValue, 12);
assert.equal(zeroBaselineEffect.deltaRatio, null);

const beforeRefundRate = metric("refund_rate", "2026-05-01", 1, 100, "negative_guardrail");
const afterRefundRate = metric("refund_rate", "2026-05-08", 7, 100, "negative_guardrail");
const degradedGuardrail = reviewGuardrailResult({
  guardrailResultId: "guardrail_result:plan-aov:refund_rate",
  experimentPlan: draft.experimentPlan,
  guardrail: draft.experimentPlan.measurement.guardrails[0],
  beforeMetricSnapshot: beforeRefundRate,
  afterMetricSnapshot: afterRefundRate,
});
assert.equal(degradedGuardrail.outcome, "degraded");

const trajectory = assembleInterventionTrajectory({
  interventionTrajectoryId: "intervention_trajectory:plan-aov:dd-p5-s1",
  experimentPlan: draft.experimentPlan,
  acceptance,
  appliedLifecycleRecord: applied,
  actionEffect,
  guardrailResults: [degradedGuardrail],
});
assert.equal(trajectory.overallVerdict, "mixed_guardrail_degraded");
assert.notEqual(trajectory.overallVerdict, "clean_success");
assert.ok(trajectory.adoptionRefs.includes(applied.lifecycleRecordId));
assert.throws(
  () =>
    assembleInterventionTrajectory({
      interventionTrajectoryId: "intervention_trajectory:wrong-effect-plan",
      experimentPlan: draft.experimentPlan,
      acceptance,
      appliedLifecycleRecord: applied,
      actionEffect: { ...actionEffect, experimentPlanId: "experiment_plan:other" },
      guardrailResults: [degradedGuardrail],
    }),
  /Action effect must reference the same experiment plan/,
);

const evidenceRecord = buildEvidenceRecord({
  evidenceRecordId: "evidence_record:plan-aov:dd-p5-s1",
  trajectory,
  opportunityGap,
  actionEffect,
  guardrailResults: [degradedGuardrail],
});
assert.equal(evidenceRecord.verdict, "mixed_guardrail_degraded");
assert.equal(evidenceRecord.segmentRef, opportunityGap.segmentCandidateId);
assert.equal(evidenceRecord.opportunityGapId, opportunityGap.opportunityGapId);
assert.equal(evidenceRecord.outcomeRef, actionEffect.actionEffectId);
assert.deepEqual(evidenceRecord.llmGeneratedClaims, []);
assert.ok(evidenceRecord.reproducibleInputRefs.includes(opportunityGap.segmentCandidateId));
assert.ok(evidenceRecord.reproducibleInputRefs.includes(actionEffect.actionEffectId));
assert.ok(evidenceRecord.adoptionRefs.includes(applied.lifecycleRecordId));
assert.deepEqual(
  buildEvidenceRecord({ evidenceRecordId: "evidence_record:plan-aov:dd-p5-s1", trajectory, opportunityGap, actionEffect, guardrailResults: [degradedGuardrail] }),
  evidenceRecord,
);
assert.throws(
  () => buildEvidenceRecord({ evidenceRecordId: "evidence_record:mismatch", trajectory, opportunityGap, actionEffect: zeroBaselineEffect, guardrailResults: [degradedGuardrail] }),
  /Evidence record action effect must match/,
);
assert.throws(
  () => buildEvidenceRecord({ evidenceRecordId: "evidence_record:missing-guardrail", trajectory, opportunityGap, actionEffect, guardrailResults: [] }),
  /Evidence record guardrail results must match/,
);

const weakEffect = reviewActionEffect({
  actionEffectId: "action_effect:plan-aov:weak_sample",
  experimentPlan: draft.experimentPlan,
  beforeMetricSnapshot: metric("avg_order_value", "2026-05-01", 250, 5, "growth_metric"),
  afterMetricSnapshot: metric("avg_order_value", "2026-05-08", 300, 5, "growth_metric"),
});
assert.equal(weakEffect.sampleStatus, "weak_sample");
assert.equal(weakEffect.confidenceLabel, "low");
assert.equal(weakEffect.interpretation, "needs_more_data_missing_or_weak_sample");

const missingGuardrail = reviewGuardrailResult({
  guardrailResultId: "guardrail_result:plan-aov:missing_refund_rate",
  experimentPlan: draft.experimentPlan,
  guardrail: draft.experimentPlan.measurement.guardrails[0],
});
assert.equal(missingGuardrail.sampleStatus, "needs_more_data");
assert.equal(missingGuardrail.outcome, "needs_more_data");
const needsMoreDataTrajectory = assembleInterventionTrajectory({
  interventionTrajectoryId: "intervention_trajectory:plan-aov:needs-more-data",
  experimentPlan: draft.experimentPlan,
  acceptance,
  appliedLifecycleRecord: applied,
  actionEffect,
  guardrailResults: [missingGuardrail],
});
assert.equal(needsMoreDataTrajectory.overallVerdict, "needs_more_data");
assert.throws(
  () =>
    assembleInterventionTrajectory({
      interventionTrajectoryId: "intervention_trajectory:not-applied",
      experimentPlan: draft.experimentPlan,
      acceptance,
      appliedLifecycleRecord: { ...applied, lifecycleRecordId: "experiment_lifecycle:measure:not-adoption", fromState: "applied", toState: "measured" },
      actionEffect,
      guardrailResults: [degradedGuardrail],
    }),
  /requires an applied merchant lifecycle record/,
);

const migration = readFileSync("migrations/0007_evidence_store.sql", "utf8");
assert.match(migration, /CREATE TABLE IF NOT EXISTS action_effects/);
assert.match(migration, /CREATE TABLE IF NOT EXISTS guardrail_results/);
assert.match(migration, /CREATE TABLE IF NOT EXISTS intervention_trajectories/);
assert.match(migration, /CREATE TABLE IF NOT EXISTS evidence_records/);
assert.match(migration, /llm_generated_claims JSONB NOT NULL DEFAULT '\[\]'::jsonb CHECK \(llm_generated_claims = '\[\]'::jsonb\)/);
assert.match(migration, /adoption_refs JSONB NOT NULL CHECK \(jsonb_array_length\(adoption_refs\) > 0\)/);

const doc = readFileSync("docs/evidence-store-v1.md", "utf8");
assert.match(doc, /directional before\/after evidence, not causal proof/);
assert.match(doc, /merchant adoption refs/);
assert.match(doc, /needs_more_data/);
assert.match(doc, /LLM-generated claims are not evidence facts/);

function metric(
  metricId: MetricSnapshot["definition"]["metricId"],
  snapshotDate: string,
  numeratorValue: number,
  denominatorValue: number,
  guardrailRelation: MetricSnapshot["definition"]["guardrailRelation"],
): MetricSnapshot {
  return {
    metricSnapshotId: `metric:brand-1:store-target:${snapshotDate}:${metricId}`,
    brandId: "brand-1",
    storeId: "store-target",
    snapshotDate,
    definition: {
      metricId,
      label: metricId,
      numerator: "fixture numerator",
      denominator: "fixture denominator",
      window: metricId === "repurchase_90d_rate" ? "90d" : "snapshot",
      owner: "data-dyna-core",
      source: ["fixture"],
      projectionInputRefs: ["fixture.projections"],
      guardrailRelation,
    },
    numeratorValue,
    denominatorValue,
    value: denominatorValue === 0 ? null : Math.round((numeratorValue / denominatorValue) * 10000) / 10000,
    evidenceRefs: [`fixture:${metricId}:${snapshotDate}`],
  };
}
