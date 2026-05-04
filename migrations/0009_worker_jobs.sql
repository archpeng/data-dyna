CREATE TABLE IF NOT EXISTS worker_jobs (
  job_id TEXT PRIMARY KEY,
  worker_kind TEXT NOT NULL CHECK (worker_kind IN ('projection', 'snapshot', 'benchmark', 'evidence')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'claimed', 'running', 'succeeded', 'retry_scheduled', 'dead_lettered', 'cancelled_by_operator')),
  brand_id TEXT,
  merchant_id TEXT,
  store_id TEXT,
  source TEXT NOT NULL,
  producer_service TEXT,
  producer_environment TEXT,
  input_watermark JSONB NOT NULL CHECK (jsonb_typeof(input_watermark) = 'object'),
  idempotency_identity TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  locked_by TEXT,
  locked_until TIMESTAMPTZ,
  heartbeat_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error_class TEXT CHECK (last_error_class IS NULL OR last_error_class IN ('transient_storage', 'transient_runtime', 'contract_violation', 'tenant_policy', 'idempotency_conflict', 'unexpected')),
  last_error_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS worker_jobs_idempotency_identity_unique_idx
  ON worker_jobs (
    worker_kind,
    COALESCE(merchant_id, ''),
    COALESCE(store_id, ''),
    source,
    COALESCE(producer_service, ''),
    COALESCE(producer_environment, ''),
    idempotency_identity
  );

CREATE INDEX IF NOT EXISTS worker_jobs_claimable_idx
  ON worker_jobs (worker_kind, status, next_run_at, locked_until, created_at);

CREATE INDEX IF NOT EXISTS worker_jobs_tenant_status_idx
  ON worker_jobs (merchant_id, store_id, worker_kind, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS worker_job_attempts (
  attempt_id BIGSERIAL PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES worker_jobs(job_id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  worker_kind TEXT NOT NULL CHECK (worker_kind IN ('projection', 'snapshot', 'benchmark', 'evidence')),
  claimed_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'checkpointed', 'succeeded', 'retryable_failed', 'terminal_failed', 'dead_lettered')),
  input_watermark JSONB NOT NULL CHECK (jsonb_typeof(input_watermark) = 'object'),
  output_watermark JSONB CHECK (output_watermark IS NULL OR jsonb_typeof(output_watermark) = 'object'),
  failure_class TEXT CHECK (failure_class IS NULL OR failure_class IN ('transient_storage', 'transient_runtime', 'contract_violation', 'tenant_policy', 'idempotency_conflict', 'unexpected')),
  safe_diagnostic JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(safe_diagnostic) = 'object'),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  heartbeat_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS worker_job_attempts_job_idx
  ON worker_job_attempts (job_id, attempt_number DESC);

CREATE TABLE IF NOT EXISTS worker_checkpoints (
  checkpoint_id TEXT PRIMARY KEY,
  worker_kind TEXT NOT NULL CHECK (worker_kind IN ('projection', 'snapshot', 'benchmark', 'evidence')),
  brand_id TEXT,
  merchant_id TEXT,
  store_id TEXT,
  source TEXT NOT NULL,
  producer_service TEXT,
  producer_environment TEXT,
  committed_watermark JSONB NOT NULL CHECK (jsonb_typeof(committed_watermark) = 'object'),
  committed_job_id TEXT NOT NULL REFERENCES worker_jobs(job_id) ON DELETE RESTRICT,
  committed_attempt_id BIGINT NOT NULL REFERENCES worker_job_attempts(attempt_id) ON DELETE RESTRICT,
  output_summary JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(output_summary) = 'object'),
  committed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS worker_checkpoints_scope_unique_idx
  ON worker_checkpoints (
    worker_kind,
    COALESCE(merchant_id, ''),
    COALESCE(store_id, ''),
    source,
    COALESCE(producer_service, ''),
    COALESCE(producer_environment, '')
  );

CREATE INDEX IF NOT EXISTS worker_checkpoints_tenant_idx
  ON worker_checkpoints (merchant_id, store_id, worker_kind, updated_at DESC);

CREATE TABLE IF NOT EXISTS worker_dead_letters (
  dead_letter_id BIGSERIAL PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE REFERENCES worker_jobs(job_id) ON DELETE CASCADE,
  attempt_id BIGINT NOT NULL REFERENCES worker_job_attempts(attempt_id) ON DELETE RESTRICT,
  worker_kind TEXT NOT NULL CHECK (worker_kind IN ('projection', 'snapshot', 'benchmark', 'evidence')),
  brand_id TEXT,
  merchant_id TEXT,
  store_id TEXT,
  source TEXT NOT NULL,
  producer_service TEXT,
  producer_environment TEXT,
  input_watermark JSONB NOT NULL CHECK (jsonb_typeof(input_watermark) = 'object'),
  attempt_count INTEGER NOT NULL CHECK (attempt_count > 0),
  failure_class TEXT NOT NULL CHECK (failure_class IN ('transient_storage', 'transient_runtime', 'contract_violation', 'tenant_policy', 'idempotency_conflict', 'unexpected')),
  reason_code TEXT NOT NULL,
  safe_diagnostic JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(safe_diagnostic) = 'object'),
  next_operator_action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS worker_dead_letters_tenant_idx
  ON worker_dead_letters (merchant_id, store_id, worker_kind, created_at DESC);
