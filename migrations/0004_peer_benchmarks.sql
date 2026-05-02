CREATE TABLE IF NOT EXISTS peer_groups (
  peer_group_id TEXT PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  segment_label TEXT NOT NULL CHECK (segment_label = 'independent_cafe_core'),
  metric_id TEXT NOT NULL CHECK (metric_id IN ('repurchase_90d_rate', 'avg_order_value', 'refund_rate', 'checkout_started_cart_rate')),
  metric_window TEXT NOT NULL CHECK (metric_window IN ('snapshot', '90d')),
  min_peer_store_count INTEGER NOT NULL CHECK (min_peer_store_count >= 3),
  peer_store_count INTEGER NOT NULL CHECK (peer_store_count >= 0),
  sample_status TEXT NOT NULL CHECK (sample_status IN ('sufficient', 'weak_sample', 'insufficient_sample')),
  deidentification_method TEXT NOT NULL CHECK (deidentification_method = 'aggregate_only_no_peer_store_ids'),
  evidence_refs TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS peer_benchmarks (
  peer_benchmark_id TEXT PRIMARY KEY,
  peer_group_id TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  segment_label TEXT NOT NULL CHECK (segment_label = 'independent_cafe_core'),
  metric_id TEXT NOT NULL CHECK (metric_id IN ('repurchase_90d_rate', 'avg_order_value', 'refund_rate', 'checkout_started_cart_rate')),
  metric_window TEXT NOT NULL CHECK (metric_window IN ('snapshot', '90d')),
  guardrail_relation TEXT NOT NULL CHECK (guardrail_relation IN ('growth_metric', 'negative_guardrail', 'funnel_metric')),
  peer_store_count INTEGER NOT NULL CHECK (peer_store_count >= 0),
  min_peer_store_count INTEGER NOT NULL CHECK (min_peer_store_count >= 3),
  sample_status TEXT NOT NULL CHECK (sample_status IN ('sufficient', 'weak_sample', 'insufficient_sample')),
  median_value NUMERIC(14, 6),
  p75_value NUMERIC(14, 6),
  confidence NUMERIC(5, 4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence_refs TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS opportunity_gaps (
  opportunity_gap_id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  segment_candidate_id TEXT NOT NULL,
  segment_label TEXT NOT NULL CHECK (segment_label = 'independent_cafe_core'),
  metric_id TEXT NOT NULL CHECK (metric_id IN ('repurchase_90d_rate', 'avg_order_value', 'refund_rate', 'checkout_started_cart_rate')),
  metric_window TEXT NOT NULL CHECK (metric_window IN ('snapshot', '90d')),
  guardrail_relation TEXT NOT NULL CHECK (guardrail_relation IN ('growth_metric', 'negative_guardrail', 'funnel_metric')),
  target_value NUMERIC(14, 6) NOT NULL,
  peer_median_value NUMERIC(14, 6),
  peer_p75_value NUMERIC(14, 6),
  comparison_basis TEXT NOT NULL CHECK (comparison_basis IN ('peer_p75', 'peer_median')),
  direction TEXT NOT NULL CHECK (direction IN ('higher_is_better', 'lower_is_better')),
  gap_value NUMERIC(14, 6) NOT NULL CHECK (gap_value >= 0),
  gap_ratio NUMERIC(14, 6),
  rank INTEGER,
  confidence NUMERIC(5, 4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  sample_status TEXT NOT NULL CHECK (sample_status IN ('sufficient', 'weak_sample', 'insufficient_sample')),
  interpretation TEXT NOT NULL CHECK (interpretation IN ('directional_non_causal_gap', 'insufficient_sample_not_ranked')),
  evidence_refs TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS peer_groups_segment_metric_date_idx
  ON peer_groups (segment_label, metric_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS peer_benchmarks_group_idx
  ON peer_benchmarks (peer_group_id, metric_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS opportunity_gaps_store_date_idx
  ON opportunity_gaps (store_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS opportunity_gaps_rank_idx
  ON opportunity_gaps (sample_status, rank);
