CREATE TABLE IF NOT EXISTS agent_runs (
  agent_run_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  opportunity_gap_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'draft_captured', 'failed')),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  thinking_level TEXT,
  profile TEXT NOT NULL DEFAULT 'unselected',
  runtime_mode TEXT NOT NULL CHECK (runtime_mode IN ('pi_sdk_adapter', 'unselected')),
  auth_ref TEXT NOT NULL DEFAULT 'unselected',
  prompt_ref TEXT NOT NULL,
  context_bundle_version TEXT NOT NULL CHECK (context_bundle_version = 'agent-context-bundle.v1'),
  context_hash TEXT NOT NULL,
  context_seed_hash TEXT NOT NULL DEFAULT 'missing_context_seed_hash',
  tool_catalog_version TEXT NOT NULL DEFAULT 'agent-read-tools.v1' CHECK (tool_catalog_version = 'agent-read-tools.v1'),
  tool_policy_version TEXT NOT NULL DEFAULT 'agent-runtime-policy.v1' CHECK (tool_policy_version = 'agent-runtime-policy.v1'),
  draft JSONB,
  error_message TEXT,
  evidence_refs TEXT[] NOT NULL DEFAULT '{}',
  CHECK (status <> 'draft_captured' OR draft IS NOT NULL),
  CHECK (draft IS NULL OR draft->>'truthStatus' = 'agent_draft_not_core_truth'),
  CHECK (draft IS NULL OR jsonb_array_length(COALESCE(draft->'requestedCoreWrites', '[]'::jsonb)) = 0)
);

CREATE TABLE IF NOT EXISTS agent_run_events (
  agent_run_event_id TEXT PRIMARY KEY,
  agent_run_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  opportunity_gap_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('run_started', 'attempt_loaded', 'policy_evaluated', 'runtime_selected', 'harness_invoked', 'tool_call_attempt', 'tool_call_denied', 'tool_result_sanitized', 'harness_transcript_event', 'draft_captured', 'draft_validation_evaluated', 'merchant_review_requested', 'run_failed')),
  occurred_at TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS agent_runs_store_gap_idx
  ON agent_runs (store_id, opportunity_gap_id, started_at DESC);

CREATE INDEX IF NOT EXISTS agent_runs_session_idx
  ON agent_runs (session_id, started_at DESC);

CREATE INDEX IF NOT EXISTS agent_run_events_run_idx
  ON agent_run_events (agent_run_id, occurred_at);
