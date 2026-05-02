import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { GuardrailRelation, MetricSnapshot, RestaurantSegmentCandidate, SnapshotMetricId } from "../src/snapshots/independent-cafe-snapshots.ts";
import { rebuildPeerBenchmarkOpportunityGaps } from "../src/benchmarks/opportunity-gaps.ts";

const snapshotDate = "2026-05-02";
const targetSegment = segment("brand-1", "store-target", "target-segment");

const targetMetrics = [
  metric("brand-1", "store-target", "avg_order_value", "growth_metric", 50),
  metric("brand-1", "store-target", "checkout_started_cart_rate", "funnel_metric", 0.4),
  metric("brand-1", "store-target", "refund_rate", "negative_guardrail", 0.1),
  metric("brand-1", "store-target", "repurchase_90d_rate", "growth_metric", 0.2),
];

const peerSegments = [
  segment("peer-brand", "peer-store-1", "peer-segment-1"),
  segment("peer-brand", "peer-store-2", "peer-segment-2"),
  segment("peer-brand", "peer-store-3", "peer-segment-3"),
];

const peerMetrics = [
  metric("peer-brand", "peer-store-1", "avg_order_value", "growth_metric", 55),
  metric("peer-brand", "peer-store-2", "avg_order_value", "growth_metric", 60),
  metric("peer-brand", "peer-store-3", "avg_order_value", "growth_metric", 70),
  metric("peer-brand", "peer-store-1", "checkout_started_cart_rate", "funnel_metric", 0.6),
  metric("peer-brand", "peer-store-2", "checkout_started_cart_rate", "funnel_metric", 0.7),
  metric("peer-brand", "peer-store-3", "checkout_started_cart_rate", "funnel_metric", 0.8),
  metric("peer-brand", "peer-store-1", "refund_rate", "negative_guardrail", 0.02),
  metric("peer-brand", "peer-store-2", "refund_rate", "negative_guardrail", 0.03),
  metric("peer-brand", "peer-store-3", "refund_rate", "negative_guardrail", 0.04),
  metric("peer-brand", "peer-store-1", "repurchase_90d_rate", "growth_metric", 0.3),
  metric("peer-brand", "peer-store-2", "repurchase_90d_rate", "growth_metric", 0.4),
  metric("peer-brand", "peer-store-3", "repurchase_90d_rate", "growth_metric", 0.5),
  metric("peer-brand", "non-cafe-store", "avg_order_value", "growth_metric", 999),
];

const rebuilt = rebuildPeerBenchmarkOpportunityGaps({
  targetMetricSnapshots: targetMetrics,
  targetRestaurantSegments: [targetSegment],
  peerMetricSnapshots: peerMetrics,
  peerRestaurantSegments: peerSegments,
  snapshotDate,
});

assert.equal(rebuilt.peerGroups.length, 4);
assert.equal(rebuilt.peerBenchmarks.length, 4);
assert.equal(rebuilt.opportunityGaps.length, 4);

for (const peerGroup of rebuilt.peerGroups) {
  assert.equal(peerGroup.segmentLabel, "independent_cafe_core");
  assert.equal(peerGroup.minPeerStoreCount, 3);
  assert.equal(peerGroup.peerStoreCount, 3);
  assert.equal(peerGroup.sampleStatus, "sufficient");
  assert.equal(peerGroup.deidentificationMethod, "aggregate_only_no_peer_store_ids");
  assert.ok(peerGroup.evidenceRefs.every((ref) => ref.startsWith("peer_metric_aggregate:")));
}

const aovBenchmark = benchmark("avg_order_value");
assert.equal(aovBenchmark?.medianValue, 60);
assert.equal(aovBenchmark?.p75Value, 70);
assert.equal(aovBenchmark?.confidence, 0.7);
assert.equal(aovBenchmark?.evidenceRefs.includes(aovBenchmark.peerGroupId), true);

const aovGap = gap("avg_order_value");
assert.equal(aovGap?.segmentCandidateId, "target-segment");
assert.equal(aovGap?.metricWindow, "snapshot");
assert.equal(aovGap?.guardrailRelation, "growth_metric");
assert.equal(aovGap?.targetValue, 50);
assert.equal(aovGap?.peerMedianValue, 60);
assert.equal(aovGap?.peerP75Value, 70);
assert.equal(aovGap?.comparisonBasis, "peer_p75");
assert.equal(aovGap?.direction, "higher_is_better");
assert.equal(aovGap?.gapValue, 20);
assert.equal(aovGap?.gapRatio, 0.2857);
assert.equal(aovGap?.sampleStatus, "sufficient");
assert.equal(aovGap?.interpretation, "directional_non_causal_gap");
assert.ok(aovGap?.rank !== null);
assert.ok(aovGap?.evidenceRefs.includes("target-segment"));
assert.ok(aovGap?.evidenceRefs.includes("metric:brand-1:store-target:2026-05-02:avg_order_value"));

const refundGap = gap("refund_rate");
assert.equal(refundGap?.comparisonBasis, "peer_median");
assert.equal(refundGap?.direction, "lower_is_better");
assert.equal(refundGap?.peerMedianValue, 0.03);
assert.equal(refundGap?.gapValue, 0.07);
assert.equal(refundGap?.rank, 1);

const repurchaseGap = gap("repurchase_90d_rate");
assert.equal(repurchaseGap?.metricWindow, "90d");
assert.equal(repurchaseGap?.comparisonBasis, "peer_p75");
assert.equal(repurchaseGap?.peerP75Value, 0.5);
assert.equal(repurchaseGap?.gapValue, 0.3);

const serialized = JSON.stringify(rebuilt);
assert.doesNotMatch(serialized, /peer-store-1|peer-store-2|peer-store-3|non-cafe-store/);
assert.doesNotMatch(serialized, /member-|customer-/);
assert.doesNotMatch(serialized, /actionRegistry|actionType|experiment_plan|coupon|price_change/);

const weakSample = rebuildPeerBenchmarkOpportunityGaps({
  targetMetricSnapshots: [metric("brand-1", "store-target", "avg_order_value", "growth_metric", 50)],
  targetRestaurantSegments: [targetSegment],
  peerMetricSnapshots: [
    metric("peer-brand", "peer-store-1", "avg_order_value", "growth_metric", 55),
    metric("peer-brand", "peer-store-2", "avg_order_value", "growth_metric", 60),
  ],
  peerRestaurantSegments: [segment("peer-brand", "peer-store-1", "peer-segment-1"), segment("peer-brand", "peer-store-2", "peer-segment-2")],
  snapshotDate,
});
assert.equal(weakSample.peerGroups[0]?.sampleStatus, "weak_sample");
assert.equal(weakSample.peerBenchmarks[0]?.sampleStatus, "weak_sample");
assert.equal(weakSample.opportunityGaps[0]?.sampleStatus, "weak_sample");
assert.equal(weakSample.opportunityGaps[0]?.rank, null);
assert.equal(weakSample.opportunityGaps[0]?.interpretation, "insufficient_sample_not_ranked");

const insufficientSample = rebuildPeerBenchmarkOpportunityGaps({
  targetMetricSnapshots: [metric("brand-1", "store-target", "avg_order_value", "growth_metric", 50)],
  targetRestaurantSegments: [targetSegment],
  peerMetricSnapshots: [],
  peerRestaurantSegments: [],
  snapshotDate,
});
assert.equal(insufficientSample.peerGroups[0]?.sampleStatus, "insufficient_sample");
assert.equal(insufficientSample.peerBenchmarks[0]?.medianValue, null);
assert.equal(insufficientSample.opportunityGaps[0]?.rank, null);

const thresholdFloor = rebuildPeerBenchmarkOpportunityGaps({
  targetMetricSnapshots: [metric("brand-1", "store-target", "avg_order_value", "growth_metric", 50)],
  targetRestaurantSegments: [targetSegment],
  peerMetricSnapshots: [metric("peer-brand", "peer-store-1", "avg_order_value", "growth_metric", 55)],
  peerRestaurantSegments: [segment("peer-brand", "peer-store-1", "peer-segment-1")],
  snapshotDate,
  minPeerStoreCount: 1,
});
assert.equal(thresholdFloor.peerGroups[0]?.minPeerStoreCount, 3);
assert.equal(thresholdFloor.peerGroups[0]?.sampleStatus, "weak_sample");
assert.equal(thresholdFloor.opportunityGaps[0]?.rank, null);

const rerun = rebuildPeerBenchmarkOpportunityGaps({
  targetMetricSnapshots: targetMetrics,
  targetRestaurantSegments: [targetSegment],
  peerMetricSnapshots: peerMetrics,
  peerRestaurantSegments: peerSegments,
  snapshotDate,
});
assert.deepEqual(rerun, rebuilt);

const migration = readFileSync("migrations/0004_peer_benchmarks.sql", "utf8");
for (const table of ["peer_groups", "peer_benchmarks", "opportunity_gaps"]) {
  assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
}
assert.match(migration, /min_peer_store_count INTEGER NOT NULL CHECK \(min_peer_store_count >= 3\)/);
assert.match(migration, /deidentification_method TEXT NOT NULL CHECK \(deidentification_method = 'aggregate_only_no_peer_store_ids'\)/);
assert.match(migration, /interpretation TEXT NOT NULL CHECK \(interpretation IN \('directional_non_causal_gap', 'insufficient_sample_not_ranked'\)\)/);

function benchmark(metricId: SnapshotMetricId) {
  return rebuilt.peerBenchmarks.find((candidate) => candidate.metricId === metricId);
}

function gap(metricId: SnapshotMetricId) {
  return rebuilt.opportunityGaps.find((candidate) => candidate.metricId === metricId);
}

function segment(brandId: string, storeId: string, segmentCandidateId: string): RestaurantSegmentCandidate {
  return {
    segmentCandidateId,
    brandId,
    storeId,
    snapshotDate,
    label: "independent_cafe_core",
    confidence: 0.9,
    evidenceRefs: [`segment_evidence:${segmentCandidateId}`],
    confirmationStatus: "confirmed",
    classificationMethod: "deterministic_projection_rule",
  };
}

function metric(
  brandId: string,
  storeId: string,
  metricId: SnapshotMetricId,
  guardrailRelation: GuardrailRelation,
  value: number,
): MetricSnapshot {
  return {
    metricSnapshotId: `metric:${brandId}:${storeId}:${snapshotDate}:${metricId}`,
    brandId,
    storeId,
    snapshotDate,
    definition: {
      metricId,
      label: metricId,
      numerator: `${metricId} numerator`,
      denominator: `${metricId} denominator`,
      window: metricId === "repurchase_90d_rate" ? "90d" : "snapshot",
      owner: "data-dyna-core",
      source: ["metric_snapshots"],
      projectionInputRefs: ["BusinessProjections.fixture"],
      guardrailRelation,
    },
    numeratorValue: value,
    denominatorValue: 1,
    value,
    evidenceRefs: [`metric_evidence:${brandId}:${storeId}:${metricId}`],
  };
}
