import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { OpportunityGap } from "../src/benchmarks/opportunity-gaps.ts";
import { buildAgentContextBundle } from "../src/agent/context-bundle.ts";
import { draftFixtureExperimentPlanFromContext } from "../src/agent/experiment-plan.ts";
import { validateExperimentPlan } from "../src/agent/experiment-validator.ts";
import { EventNameSchema } from "../src/contracts/event-contract.ts";
import { toPostHogSinkEvent } from "../src/ingestion/posthog-sink.ts";
import {
  MERCHANT_REVIEW_EVENT_NAMES,
  acceptExperimentReview,
  buildMobileHqMerchantActionEvent,
  canTransitionActionLifecycle,
  confirmMerchantPreference,
  createPreferenceCandidateFromRejection,
  recordActionLifecycleTransition,
  recordExperimentReviewModification,
  recordExperimentReviewViewed,
  rejectExperimentReview,
  submitExperimentPlanForMerchantReview,
} from "../src/merchant-review/experiment-review.ts";

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
  agentRunId: "agent_run:brand-1:store-target:gap-aov:dd-p4-s1",
  sessionId: "agent_session:brand-1:store-target:gap-aov",
  opportunityGap,
  createdAt: "2026-05-02T00:00:00.000Z",
});
const draft = draftFixtureExperimentPlanFromContext(context);
const validation = validateExperimentPlan({ context, hypothesis: draft.hypothesis, experimentPlan: draft.experimentPlan });
assert.equal(validation.decision, "accept");

const merchantActor = { actorType: "merchant" as const, actorId: "merchant-1", displayName: "Cafe owner" };
const submission = submitExperimentPlanForMerchantReview({
  reviewId: "experiment_review:brand-1:store-target:plan-aov",
  experimentPlan: draft.experimentPlan,
  validationResult: validation,
  submittedAt: "2026-05-02T01:00:00.000Z",
});
assert.equal(submission.reviewStatus, "submitted_for_review");
assert.equal(submission.lifecycleState, "drafted");
assert.deepEqual(submission.evidenceRefs, draft.experimentPlan.evidenceRefs);

assert.throws(
  () =>
    submitExperimentPlanForMerchantReview({
      reviewId: "experiment_review:blocked",
      experimentPlan: draft.experimentPlan,
      validationResult: { ...validation, decision: "needs_more_data", reasonCodes: ["weak_or_insufficient_sample"] },
      submittedAt: "2026-05-02T01:00:00.000Z",
    }),
  /Only accepted validator results/,
);

const viewed = recordExperimentReviewViewed({
  submission,
  reviewViewId: "experiment_review_view:brand-1:store-target:plan-aov:1",
  viewedAt: "2026-05-02T01:05:00.000Z",
  actor: merchantActor,
});
assert.equal(viewed.eventName, "mobile_hq.experiment_review_viewed");

const modification = recordExperimentReviewModification({
  submission,
  decisionId: "experiment_review_decision:modify:1",
  decidedAt: "2026-05-02T01:07:00.000Z",
  actor: merchantActor,
  modificationSummary: "Merchant asked to narrow the experiment to weekday mornings.",
});
assert.equal(modification.decision, "modified");
assert.equal(modification.lifecycleState, "drafted");

const accepted = acceptExperimentReview({
  submission,
  decisionId: "experiment_review_decision:accept:1",
  decidedAt: "2026-05-02T01:10:00.000Z",
  actor: merchantActor,
});
assert.equal(accepted.decision, "accepted");
assert.deepEqual(accepted.lifecycleTransition, { from: "drafted", to: "accepted" });

const applied = recordActionLifecycleTransition({
  lifecycleRecordId: "experiment_lifecycle:apply:1",
  reviewId: submission.reviewId,
  experimentPlanId: submission.experimentPlanId,
  brandId: submission.brandId,
  storeId: submission.storeId,
  eventName: "mobile_hq.experiment_applied_recorded",
  occurredAt: "2026-05-02T02:00:00.000Z",
  actor: merchantActor,
  fromState: "accepted",
  toState: "applied",
  acceptanceDecisionId: accepted.decisionId,
  rollbackRef: "rollback_contract:weekday-morning-aov:1",
  evidenceRefs: submission.evidenceRefs,
});
assert.equal(applied.businessMutationCalled, false);
assert.equal(applied.toState, "applied");
assert.throws(
  () =>
    recordActionLifecycleTransition({
      ...applied,
      lifecycleRecordId: "experiment_lifecycle:apply:missing-acceptance",
      acceptanceDecisionId: undefined,
    }),
  /explicit merchant acceptance decision/,
);
assert.throws(
  () =>
    recordActionLifecycleTransition({
      ...applied,
      lifecycleRecordId: "experiment_lifecycle:invalid-jump",
      fromState: "drafted",
      toState: "applied",
    }),
  /Invalid action lifecycle transition/,
);

const measured = recordActionLifecycleTransition({
  lifecycleRecordId: "experiment_lifecycle:measure:1",
  reviewId: submission.reviewId,
  experimentPlanId: submission.experimentPlanId,
  brandId: submission.brandId,
  storeId: submission.storeId,
  occurredAt: "2026-05-09T02:00:00.000Z",
  actor: { actorType: "system", actorId: "data-dyna-core" },
  fromState: "applied",
  toState: "measured",
  evidenceRefs: submission.evidenceRefs,
});
assert.equal(measured.toState, "measured");
const reverted = recordActionLifecycleTransition({
  lifecycleRecordId: "experiment_lifecycle:revert:1",
  reviewId: submission.reviewId,
  experimentPlanId: submission.experimentPlanId,
  brandId: submission.brandId,
  storeId: submission.storeId,
  eventName: "mobile_hq.experiment_reverted_recorded",
  occurredAt: "2026-05-09T03:00:00.000Z",
  actor: merchantActor,
  fromState: "measured",
  toState: "reverted",
  rollbackRef: "rollback_contract:weekday-morning-aov:1",
  evidenceRefs: submission.evidenceRefs,
});
assert.equal(reverted.businessMutationCalled, false);
assert.equal(reverted.toState, "reverted");
assert.equal(canTransitionActionLifecycle("drafted", "applied"), false);
assert.equal(canTransitionActionLifecycle("measured", "kept"), true);

const rejected = rejectExperimentReview({
  submission,
  decisionId: "experiment_review_decision:reject:1",
  decidedAt: "2026-05-02T01:20:00.000Z",
  actor: merchantActor,
  reasonCode: "merchant_constraint",
  reasonText: "Do not suggest experiments that require extra morning staff without confirmation.",
});
assert.equal(rejected.rejection.createsPreferenceCandidate, true);
const candidate = createPreferenceCandidateFromRejection({
  rejection: rejected,
  preferenceCandidateId: "merchant_preference_candidate:staffing:1",
  candidateKey: "staffing_constraint",
  candidateValue: "avoid_extra_morning_staff_without_confirmation",
  createdAt: "2026-05-02T01:21:00.000Z",
});
assert.equal(candidate.status, "candidate_pending_confirmation");
assert.equal(candidate.reasonText, rejected.rejection.reasonText);
const confirmedPreference = confirmMerchantPreference({
  candidate,
  preferenceId: "merchant_preference:staffing:1",
  confirmedAt: "2026-05-02T01:22:00.000Z",
  confirmedBy: merchantActor,
});
assert.equal(confirmedPreference.status, "confirmed");
assert.equal(confirmedPreference.preferenceKey, candidate.candidateKey);

for (const eventName of MERCHANT_REVIEW_EVENT_NAMES) {
  assert.equal(EventNameSchema.parse(eventName), eventName);
  const event = buildMobileHqMerchantActionEvent({
    name: eventName,
    eventId: `evt-${eventName}`,
    occurredAt: "2026-05-02T01:10:00.000Z",
    producerService: "mobile-hq-host-bridge",
    brandId: submission.brandId,
    storeId: submission.storeId,
    actorId: merchantActor.actorId,
    experimentPlanId: submission.experimentPlanId,
    reviewId: submission.reviewId,
    preferenceId: confirmedPreference.preferenceId,
    properties: { reviewId: submission.reviewId, experimentPlanId: submission.experimentPlanId },
  });
  assert.equal(event.source, "mobile_hq");
  assert.equal(event.domain, "merchant_action");
  assert.equal(event.name, eventName);
}
const submittedEvent = buildMobileHqMerchantActionEvent({
  name: "mobile_hq.experiment_review_submitted",
  eventId: "evt-review-submitted-1",
  occurredAt: "2026-05-02T01:00:00.000Z",
  producerService: "data-dyna-core",
  brandId: submission.brandId,
  storeId: submission.storeId,
  actorId: "data-dyna-core",
  experimentPlanId: submission.experimentPlanId,
  reviewId: submission.reviewId,
});
assert.equal(submittedEvent.entity.type, "experiment_review");
assert.equal(submittedEvent.entity.id, submission.reviewId);
const preferenceEvent = buildMobileHqMerchantActionEvent({
  name: "mobile_hq.merchant_preference_confirmed",
  eventId: "evt-preference-confirmed-1",
  occurredAt: "2026-05-02T01:22:00.000Z",
  producerService: "mobile-hq-host-bridge",
  brandId: submission.brandId,
  storeId: submission.storeId,
  actorId: merchantActor.actorId,
  experimentPlanId: submission.experimentPlanId,
  preferenceId: confirmedPreference.preferenceId,
});
assert.equal(preferenceEvent.entity.type, "merchant_preference");
assert.equal(preferenceEvent.entity.id, confirmedPreference.preferenceId);
const acceptedEvent = buildMobileHqMerchantActionEvent({
  name: "mobile_hq.experiment_accepted",
  eventId: "evt-merchant-accepted-1",
  occurredAt: "2026-05-02T01:10:00.000Z",
  producerService: "mobile-hq-host-bridge",
  brandId: submission.brandId,
  storeId: submission.storeId,
  actorId: merchantActor.actorId,
  experimentPlanId: submission.experimentPlanId,
  properties: { reviewId: submission.reviewId, decisionId: accepted.decisionId },
});
assert.equal(acceptedEvent.source, "mobile_hq");
assert.equal(acceptedEvent.domain, "merchant_action");
assert.equal(acceptedEvent.name, "mobile_hq.experiment_accepted");
assert.equal(acceptedEvent.entity.type, "experiment_plan");

const sinkEvent = toPostHogSinkEvent(acceptedEvent);
assert.equal(sinkEvent.event, "mobile_hq.experiment_accepted");
assert.equal(sinkEvent.properties.source, "mobile_hq");
assert.equal(sinkEvent.properties.eventId, "evt-merchant-accepted-1");

const migration = readFileSync("migrations/0006_merchant_review.sql", "utf8");
assert.match(migration, /CREATE TABLE IF NOT EXISTS experiment_plan_reviews/);
assert.match(migration, /CREATE TABLE IF NOT EXISTS experiment_action_lifecycle_records/);
assert.match(migration, /business_mutation_called BOOLEAN NOT NULL DEFAULT FALSE CHECK \(business_mutation_called = FALSE\)/);
assert.match(migration, /CREATE TABLE IF NOT EXISTS merchant_preference_candidates/);
assert.match(migration, /CREATE TABLE IF NOT EXISTS merchant_preferences/);

const doc = readFileSync("docs/merchant-review-v1.md", "utf8");
assert.match(doc, /No external frontend repo change is required/);
assert.match(doc, /PostHog is optional product analytics only/);
assert.match(doc, /candidate_pending_confirmation/);
assert.match(doc, /businessMutationCalled = false/);
