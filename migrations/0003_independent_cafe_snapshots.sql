CREATE TABLE IF NOT EXISTS store_profile_snapshots (
  store_profile_snapshot_id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  restaurant_category TEXT NOT NULL CHECK (restaurant_category = 'independent_cafe'),
  menu_count INTEGER NOT NULL,
  item_count INTEGER NOT NULL,
  paid_order_count INTEGER NOT NULL,
  member_rfm_snapshot_count INTEGER NOT NULL,
  evidence_refs TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS metric_snapshots (
  metric_snapshot_id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  metric_id TEXT NOT NULL,
  label TEXT NOT NULL,
  numerator TEXT NOT NULL,
  denominator TEXT NOT NULL,
  numerator_value NUMERIC(14, 4) NOT NULL,
  denominator_value NUMERIC(14, 4) NOT NULL,
  value NUMERIC(14, 6),
  metric_window TEXT NOT NULL,
  owner TEXT NOT NULL CHECK (owner = 'data-dyna-core'),
  source_tables TEXT[] NOT NULL,
  projection_input_refs TEXT[] NOT NULL,
  guardrail_relation TEXT NOT NULL,
  evidence_refs TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS restaurant_segments (
  segment_candidate_id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  snapshot_date DATE NOT NULL,
  label TEXT NOT NULL CHECK (label = 'independent_cafe_core'),
  confidence NUMERIC(5, 4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence_refs TEXT[] NOT NULL DEFAULT '{}',
  confirmation_status TEXT NOT NULL CHECK (confirmation_status IN ('unconfirmed', 'confirmed', 'rejected')),
  confirmation_id TEXT,
  classification_method TEXT NOT NULL CHECK (classification_method = 'deterministic_projection_rule')
);

CREATE TABLE IF NOT EXISTS merchant_confirmations (
  confirmation_id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type = 'restaurant_segment'),
  target_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'rejected')),
  confirmed_at TIMESTAMPTZ NOT NULL,
  evidence_refs TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL CHECK (source = 'merchant_confirmation_fixture')
);

CREATE INDEX IF NOT EXISTS store_profile_snapshots_store_date_idx
  ON store_profile_snapshots (store_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS metric_snapshots_store_metric_date_idx
  ON metric_snapshots (store_id, metric_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS restaurant_segments_store_date_idx
  ON restaurant_segments (store_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS merchant_confirmations_target_idx
  ON merchant_confirmations (target_type, target_id);
