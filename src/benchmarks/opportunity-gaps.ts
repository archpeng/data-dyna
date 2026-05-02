import { z } from "zod";
import {
  GuardrailRelationSchema,
  SnapshotMetricIdSchema,
  type GuardrailRelation,
  type MetricSnapshot,
  type RestaurantSegmentCandidate,
  type SnapshotMetricId,
} from "../snapshots/independent-cafe-snapshots.ts";

export const PeerSampleStatusSchema = z.enum(["sufficient", "weak_sample", "insufficient_sample"]);
export const GapDirectionSchema = z.enum(["higher_is_better", "lower_is_better"]);
export const GapComparisonBasisSchema = z.enum(["peer_p75", "peer_median"]);
export const BenchmarkInterpretationSchema = z.enum(["directional_non_causal_gap", "insufficient_sample_not_ranked"]);

export type PeerSampleStatus = z.infer<typeof PeerSampleStatusSchema>;
export type GapDirection = z.infer<typeof GapDirectionSchema>;
export type GapComparisonBasis = z.infer<typeof GapComparisonBasisSchema>;
export type BenchmarkInterpretation = z.infer<typeof BenchmarkInterpretationSchema>;

export type PeerGroup = {
  peerGroupId: string;
  snapshotDate: string;
  segmentLabel: "independent_cafe_core";
  metricId: SnapshotMetricId;
  metricWindow: MetricSnapshot["definition"]["window"];
  minPeerStoreCount: number;
  peerStoreCount: number;
  sampleStatus: PeerSampleStatus;
  deidentificationMethod: "aggregate_only_no_peer_store_ids";
  evidenceRefs: string[];
};

export type PeerBenchmark = {
  peerBenchmarkId: string;
  peerGroupId: string;
  snapshotDate: string;
  segmentLabel: "independent_cafe_core";
  metricId: SnapshotMetricId;
  metricWindow: MetricSnapshot["definition"]["window"];
  guardrailRelation: GuardrailRelation;
  peerStoreCount: number;
  minPeerStoreCount: number;
  sampleStatus: PeerSampleStatus;
  medianValue: number | null;
  p75Value: number | null;
  confidence: number;
  evidenceRefs: string[];
};

export type OpportunityGap = {
  opportunityGapId: string;
  brandId: string;
  storeId: string;
  snapshotDate: string;
  segmentCandidateId: string;
  segmentLabel: "independent_cafe_core";
  metricId: SnapshotMetricId;
  metricWindow: MetricSnapshot["definition"]["window"];
  guardrailRelation: GuardrailRelation;
  targetValue: number;
  peerMedianValue: number | null;
  peerP75Value: number | null;
  comparisonBasis: GapComparisonBasis;
  direction: GapDirection;
  gapValue: number;
  gapRatio: number | null;
  rank: number | null;
  confidence: number;
  sampleStatus: PeerSampleStatus;
  interpretation: BenchmarkInterpretation;
  evidenceRefs: string[];
};

export type PeerBenchmarkOpportunityGaps = {
  peerGroups: PeerGroup[];
  peerBenchmarks: PeerBenchmark[];
  opportunityGaps: OpportunityGap[];
};

export type PeerBenchmarkInput = {
  targetMetricSnapshots: MetricSnapshot[];
  targetRestaurantSegments: RestaurantSegmentCandidate[];
  peerMetricSnapshots: MetricSnapshot[];
  peerRestaurantSegments: RestaurantSegmentCandidate[];
  snapshotDate: string;
  minPeerStoreCount?: number;
};

const DEFAULT_MIN_PEER_STORE_COUNT = 3;
const SEGMENT_LABEL = "independent_cafe_core" as const;

export function rebuildPeerBenchmarkOpportunityGaps(input: PeerBenchmarkInput): PeerBenchmarkOpportunityGaps {
  const minPeerStoreCount = Math.max(input.minPeerStoreCount ?? DEFAULT_MIN_PEER_STORE_COUNT, DEFAULT_MIN_PEER_STORE_COUNT);
  const targetSegments = input.targetRestaurantSegments
    .filter((segment) => segment.snapshotDate === input.snapshotDate && segment.label === SEGMENT_LABEL)
    .sort((left, right) => compareStrings(left.segmentCandidateId, right.segmentCandidateId));
  const targetSegment = targetSegments[0];

  if (!targetSegment) {
    return { peerGroups: [], peerBenchmarks: [], opportunityGaps: [] };
  }

  const peerSegments = input.peerRestaurantSegments.filter((segment) => segment.snapshotDate === input.snapshotDate && segment.label === SEGMENT_LABEL);
  const peerStoreKeys = new Set(peerSegments.map((segment) => storeKey(segment.brandId, segment.storeId)));
  const targetMetrics = input.targetMetricSnapshots
    .filter((snapshot) => snapshot.snapshotDate === input.snapshotDate && snapshot.value !== null)
    .sort((left, right) => compareStrings(left.definition.metricId, right.definition.metricId));

  const peerGroups: PeerGroup[] = [];
  const peerBenchmarks: PeerBenchmark[] = [];
  const opportunityGaps: OpportunityGap[] = [];

  for (const targetMetric of targetMetrics) {
    const metricId = SnapshotMetricIdSchema.parse(targetMetric.definition.metricId);
    const guardrailRelation = GuardrailRelationSchema.parse(targetMetric.definition.guardrailRelation);
    const peerMetricValues = input.peerMetricSnapshots
      .filter(
        (snapshot) =>
          snapshot.snapshotDate === input.snapshotDate &&
          snapshot.definition.metricId === metricId &&
          snapshot.definition.window === targetMetric.definition.window &&
          snapshot.value !== null &&
          peerStoreKeys.has(storeKey(snapshot.brandId, snapshot.storeId)),
      )
      .sort((left, right) => compareStrings(left.metricSnapshotId, right.metricSnapshotId));
    const peerStoreCount = new Set(peerMetricValues.map((snapshot) => storeKey(snapshot.brandId, snapshot.storeId))).size;
    const values = peerMetricValues.map((snapshot) => snapshot.value as number).sort(compareNumbers);
    const sampleStatus = sampleStatusFor(peerStoreCount, minPeerStoreCount);
    const aggregateRef = aggregateEvidenceRef(input.snapshotDate, SEGMENT_LABEL, metricId, targetMetric.definition.window, peerStoreCount);
    const peerGroupId = `peer_group:${input.snapshotDate}:${SEGMENT_LABEL}:${metricId}:${targetMetric.definition.window}`;
    const peerBenchmarkId = `peer_benchmark:${input.snapshotDate}:${SEGMENT_LABEL}:${metricId}:${targetMetric.definition.window}`;
    const peerMedianValue = percentile(values, 0.5);
    const peerP75Value = percentile(values, 0.75);
    const peerGroup: PeerGroup = {
      peerGroupId,
      snapshotDate: input.snapshotDate,
      segmentLabel: SEGMENT_LABEL,
      metricId,
      metricWindow: targetMetric.definition.window,
      minPeerStoreCount,
      peerStoreCount,
      sampleStatus,
      deidentificationMethod: "aggregate_only_no_peer_store_ids",
      evidenceRefs: [aggregateRef],
    };
    const peerBenchmark: PeerBenchmark = {
      peerBenchmarkId,
      peerGroupId,
      snapshotDate: input.snapshotDate,
      segmentLabel: SEGMENT_LABEL,
      metricId,
      metricWindow: targetMetric.definition.window,
      guardrailRelation,
      peerStoreCount,
      minPeerStoreCount,
      sampleStatus,
      medianValue: peerMedianValue,
      p75Value: peerP75Value,
      confidence: benchmarkConfidence(sampleStatus, peerStoreCount, minPeerStoreCount),
      evidenceRefs: [peerGroupId, aggregateRef],
    };
    peerGroups.push(peerGroup);
    peerBenchmarks.push(peerBenchmark);

    const opportunityGap = buildOpportunityGap({
      targetMetric,
      targetSegment,
      peerGroup,
      peerBenchmark,
    });
    if (opportunityGap) opportunityGaps.push(opportunityGap);
  }

  const rankedGaps = rankOpportunityGaps(opportunityGaps);

  return {
    peerGroups,
    peerBenchmarks,
    opportunityGaps: rankedGaps,
  };
}

function buildOpportunityGap(input: {
  targetMetric: MetricSnapshot;
  targetSegment: RestaurantSegmentCandidate;
  peerGroup: PeerGroup;
  peerBenchmark: PeerBenchmark;
}): OpportunityGap | null {
  if (input.targetMetric.value === null) return null;
  const direction = directionFor(input.peerBenchmark.guardrailRelation);
  const comparisonBasis = direction === "lower_is_better" ? "peer_median" : "peer_p75";
  const referenceValue = comparisonBasis === "peer_median" ? input.peerBenchmark.medianValue : input.peerBenchmark.p75Value;
  if (referenceValue === null) {
    return baseOpportunityGap(input, comparisonBasis, direction, 0, null);
  }

  const rawGap = direction === "higher_is_better" ? referenceValue - input.targetMetric.value : input.targetMetric.value - referenceValue;
  const gapValue = roundMetric(Math.max(0, rawGap));
  const gapRatio = referenceValue === 0 ? null : roundMetric(gapValue / Math.abs(referenceValue));
  return baseOpportunityGap(input, comparisonBasis, direction, gapValue, gapRatio);
}

function baseOpportunityGap(
  input: {
    targetMetric: MetricSnapshot;
    targetSegment: RestaurantSegmentCandidate;
    peerGroup: PeerGroup;
    peerBenchmark: PeerBenchmark;
  },
  comparisonBasis: GapComparisonBasis,
  direction: GapDirection,
  gapValue: number,
  gapRatio: number | null,
): OpportunityGap {
  const metricId = input.targetMetric.definition.metricId;
  const interpretation = input.peerBenchmark.sampleStatus === "sufficient" ? "directional_non_causal_gap" : "insufficient_sample_not_ranked";
  return {
    opportunityGapId: `opportunity_gap:${input.targetMetric.brandId}:${input.targetMetric.storeId}:${input.targetMetric.snapshotDate}:${metricId}`,
    brandId: input.targetMetric.brandId,
    storeId: input.targetMetric.storeId,
    snapshotDate: input.targetMetric.snapshotDate,
    segmentCandidateId: input.targetSegment.segmentCandidateId,
    segmentLabel: input.targetSegment.label,
    metricId,
    metricWindow: input.targetMetric.definition.window,
    guardrailRelation: input.targetMetric.definition.guardrailRelation,
    targetValue: input.targetMetric.value as number,
    peerMedianValue: input.peerBenchmark.medianValue,
    peerP75Value: input.peerBenchmark.p75Value,
    comparisonBasis,
    direction,
    gapValue,
    gapRatio,
    rank: null,
    confidence: input.peerBenchmark.sampleStatus === "sufficient" ? input.peerBenchmark.confidence : 0.2,
    sampleStatus: input.peerBenchmark.sampleStatus,
    interpretation,
    evidenceRefs: uniqueSorted([input.targetSegment.segmentCandidateId, input.targetMetric.metricSnapshotId, input.peerGroup.peerGroupId, input.peerBenchmark.peerBenchmarkId]),
  };
}

function rankOpportunityGaps(gaps: OpportunityGap[]): OpportunityGap[] {
  const sufficientGaps = gaps
    .filter((gap) => gap.sampleStatus === "sufficient" && gap.gapValue > 0)
    .sort((left, right) => {
      const ratioOrder = (right.gapRatio ?? -1) - (left.gapRatio ?? -1);
      if (ratioOrder !== 0) return ratioOrder;
      return compareStrings(left.opportunityGapId, right.opportunityGapId);
    });
  const rankById = new Map(sufficientGaps.map((gap, index) => [gap.opportunityGapId, index + 1]));
  return gaps
    .map((gap) => ({ ...gap, rank: rankById.get(gap.opportunityGapId) ?? null }))
    .sort((left, right) => {
      if (left.rank !== null && right.rank !== null) return left.rank - right.rank;
      if (left.rank !== null) return -1;
      if (right.rank !== null) return 1;
      return compareStrings(left.opportunityGapId, right.opportunityGapId);
    });
}

function directionFor(relation: GuardrailRelation): GapDirection {
  return relation === "negative_guardrail" ? "lower_is_better" : "higher_is_better";
}

function sampleStatusFor(peerStoreCount: number, minPeerStoreCount: number): PeerSampleStatus {
  if (peerStoreCount >= minPeerStoreCount) return "sufficient";
  if (peerStoreCount > 0) return "weak_sample";
  return "insufficient_sample";
}

function benchmarkConfidence(sampleStatus: PeerSampleStatus, peerStoreCount: number, minPeerStoreCount: number): number {
  if (sampleStatus === "sufficient") return roundMetric(Math.min(0.95, 0.7 + (peerStoreCount - minPeerStoreCount) * 0.05));
  if (sampleStatus === "weak_sample") return 0.35;
  return 0.1;
}

function percentile(values: number[], quantile: number): number | null {
  if (values.length === 0) return null;
  if (quantile === 0.5 && values.length % 2 === 0) {
    const upper = values.length / 2;
    return roundMetric((values[upper - 1] + values[upper]) / 2);
  }
  const index = Math.max(0, Math.ceil(values.length * quantile) - 1);
  return roundMetric(values[index]);
}

function aggregateEvidenceRef(
  snapshotDate: string,
  segmentLabel: string,
  metricId: SnapshotMetricId,
  metricWindow: MetricSnapshot["definition"]["window"],
  peerStoreCount: number,
): string {
  return `peer_metric_aggregate:${snapshotDate}:${segmentLabel}:${metricId}:${metricWindow}:count-${peerStoreCount}`;
}

function storeKey(brandId: string, storeId: string): string {
  return `${brandId}:${storeId}`;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort(compareStrings);
}

function roundMetric(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function compareNumbers(left: number, right: number): number {
  return left - right;
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right);
}
