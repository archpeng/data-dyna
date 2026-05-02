# Peer Benchmarks and Opportunity Gaps v1

`DD-P2-S1` turns deterministic independent-café metric snapshots into aggregate peer benchmarks and opportunity gaps. It does not generate experiments, rank concrete actions, or claim causality.

## Source boundaries

- Inputs are `DD-P1-S2` metric snapshots and `restaurant_segments` for `independent_cafe_core` stores.
- Peer benchmark facts are aggregate-only; outputs do not expose individual peer store IDs or customer/member identifiers.
- Opportunity gaps are directional comparisons against peer aggregates. They are evidence for “where this store lags similar independent cafés”, not proof of cause.
- Agent-side experiment generation starts later and must consume these gaps through a validator boundary.

## Implemented surfaces

- `migrations/0004_peer_benchmarks.sql`
- `src/benchmarks/opportunity-gaps.ts`
- `tests/benchmarks-dd-p2-s1.spec.ts`

## Tables

`0004_peer_benchmarks.sql` defines:

1. `peer_groups`
2. `peer_benchmarks`
3. `opportunity_gaps`

The schema keeps segment scope to `independent_cafe_core`, metric scope to the four `DD-P1-S2` MVP metrics, and peer evidence scope to aggregate refs.

## MVP threshold and sample status

- `minPeerStoreCount` defaults to `3`.
- `sufficient`: peer store count is at least the threshold, so ranked directional gaps can be emitted.
- `weak_sample`: at least one peer store exists but count is below threshold; uncertainty must be visible and rank remains empty.
- `insufficient_sample`: no peer metric values exist; benchmark values remain empty and rank remains empty.

The threshold is intentionally small for fixture-backed MVP proof. Production governance can raise it before live multi-merchant use.

## Deterministic scoring

| Metric relation | Direction | Comparison basis | Gap formula |
|---|---|---|---|
| `growth_metric` | higher is better | peer p75 | `max(0, peer_p75 - target_value)` |
| `funnel_metric` | higher is better | peer p75 | `max(0, peer_p75 - target_value)` |
| `negative_guardrail` | lower is better | peer median | `max(0, target_value - peer_median)` |

Rank is assigned only for `sufficient` samples with positive gap values. `gapRatio` is the gap divided by the comparison basis when the basis is non-zero.

## Output contract

Each opportunity gap carries:

- target store identity (`brandId`, `storeId`) and `segmentCandidateId`
- `segmentLabel`
- `metricId` and `metricWindow`
- `guardrailRelation`
- target value, peer median, peer p75, comparison basis, direction, gap value, gap ratio, rank, confidence, and sample status
- evidence refs to the target segment, target metric snapshot, peer group, and peer benchmark
- `interpretation = directional_non_causal_gap` or `insufficient_sample_not_ranked`

## Non-goals

- No individual peer store or customer data exposure.
- No all-餐饮 mixed benchmark pool.
- No experiment generation in this slice.
- No Action Registry or concrete action ranking.
- No causal certainty from peer comparison.
