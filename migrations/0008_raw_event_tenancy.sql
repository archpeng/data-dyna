ALTER TABLE raw_events
  ADD COLUMN IF NOT EXISTS merchant_id TEXT,
  ADD COLUMN IF NOT EXISTS producer_environment TEXT,
  ADD COLUMN IF NOT EXISTS credential_id TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_scope TEXT;

UPDATE raw_events
   SET merchant_id = COALESCE(merchant_id, NULLIF(event #>> '{identity,merchantId}', '')),
       producer_environment = COALESCE(producer_environment, NULLIF(event #>> '{producer,environment}', '')),
       idempotency_scope = COALESCE(idempotency_scope, NULLIF(event #>> '{idempotency,scope}', ''), 'global')
 WHERE merchant_id IS NULL
    OR producer_environment IS NULL
    OR idempotency_scope IS NULL;

ALTER TABLE raw_events
  ALTER COLUMN idempotency_scope SET NOT NULL;

ALTER TABLE raw_events
  DROP CONSTRAINT IF EXISTS raw_events_idempotency_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS raw_events_tenant_idempotency_unique_idx
  ON raw_events (
    COALESCE(merchant_id, ''),
    COALESCE(store_id, ''),
    producer_service,
    COALESCE(producer_environment, ''),
    source,
    idempotency_scope,
    idempotency_key
  );

CREATE INDEX IF NOT EXISTS raw_events_merchant_store_received_at_idx
  ON raw_events (merchant_id, store_id, received_at DESC);

ALTER TABLE invalid_raw_events
  ADD COLUMN IF NOT EXISTS credential_id TEXT,
  ADD COLUMN IF NOT EXISTS merchant_id TEXT,
  ADD COLUMN IF NOT EXISTS store_id TEXT,
  ADD COLUMN IF NOT EXISTS producer_service TEXT,
  ADD COLUMN IF NOT EXISTS producer_environment TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS reason_code TEXT;

CREATE INDEX IF NOT EXISTS invalid_raw_events_tenant_received_at_idx
  ON invalid_raw_events (merchant_id, store_id, received_at DESC);
