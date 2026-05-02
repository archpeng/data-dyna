CREATE TABLE IF NOT EXISTS raw_events (
  event_id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  contract_version TEXT NOT NULL,
  source TEXT NOT NULL,
  domain TEXT NOT NULL,
  name TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  producer_service TEXT NOT NULL,
  brand_id TEXT,
  store_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  event JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS raw_events_source_received_at_idx
  ON raw_events (source, received_at DESC);

CREATE INDEX IF NOT EXISTS raw_events_store_received_at_idx
  ON raw_events (store_id, received_at DESC);

CREATE INDEX IF NOT EXISTS raw_events_entity_idx
  ON raw_events (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS invalid_raw_events (
  invalid_event_id BIGSERIAL PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT NOT NULL,
  payload JSONB NOT NULL
);
