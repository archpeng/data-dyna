-- DD-P4-S1 merchant review, adoption, lifecycle, and preference confirmation contracts.
-- These tables are deterministic Core persistence. PostHog remains an optional async mirror only.

CREATE TABLE IF NOT EXISTS experiment_plan_reviews (
  review_id TEXT PRIMARY KEY,
  experiment_plan_id TEXT NOT NULL,
  hypothesis_id TEXT NOT NULL,
  agent_run_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  opportunity_gap_id TEXT NOT NULL,
  review_status TEXT NOT NULL CHECK (review_status IN ('submitted_for_review')),
  lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('drafted')),
  submitted_at TIMESTAMPTZ NOT NULL,
  submitted_by JSONB NOT NULL,
  experiment_plan JSONB NOT NULL,
  validation_result JSONB NOT NULL,
  evidence_refs JSONB NOT NULL CHECK (jsonb_typeof(evidence_refs) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experiment_plan_reviews_store_submitted
  ON experiment_plan_reviews (brand_id, store_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS experiment_review_views (
  review_view_id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES experiment_plan_reviews(review_id),
  experiment_plan_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  event_name TEXT NOT NULL CHECK (event_name = 'mobile_hq.experiment_review_viewed'),
  viewed_at TIMESTAMPTZ NOT NULL,
  actor JSONB NOT NULL,
  evidence_refs JSONB NOT NULL CHECK (jsonb_typeof(evidence_refs) = 'array')
);

CREATE TABLE IF NOT EXISTS experiment_review_decisions (
  decision_id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES experiment_plan_reviews(review_id),
  experiment_plan_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('accepted', 'modified', 'rejected')),
  event_name TEXT NOT NULL CHECK (event_name IN (
    'mobile_hq.experiment_accepted',
    'mobile_hq.experiment_modified',
    'mobile_hq.experiment_rejected'
  )),
  decided_at TIMESTAMPTZ NOT NULL,
  actor JSONB NOT NULL,
  lifecycle_from_state TEXT CHECK (lifecycle_from_state IN ('drafted')),
  lifecycle_to_state TEXT CHECK (lifecycle_to_state IN ('accepted', 'rejected')),
  rejection JSONB,
  modification_summary TEXT,
  evidence_refs JSONB NOT NULL CHECK (jsonb_typeof(evidence_refs) = 'array'),
  CHECK (
    (decision = 'accepted' AND event_name = 'mobile_hq.experiment_accepted' AND lifecycle_from_state = 'drafted' AND lifecycle_to_state = 'accepted' AND rejection IS NULL)
    OR (decision = 'rejected' AND event_name = 'mobile_hq.experiment_rejected' AND lifecycle_from_state = 'drafted' AND lifecycle_to_state = 'rejected' AND rejection IS NOT NULL)
    OR (decision = 'modified' AND event_name = 'mobile_hq.experiment_modified' AND lifecycle_from_state IS NULL AND lifecycle_to_state IS NULL AND modification_summary IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_experiment_review_decisions_review
  ON experiment_review_decisions (review_id, decided_at DESC);

CREATE TABLE IF NOT EXISTS experiment_action_lifecycle_records (
  lifecycle_record_id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES experiment_plan_reviews(review_id),
  experiment_plan_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  event_name TEXT CHECK (event_name IN (
    'mobile_hq.experiment_applied_recorded',
    'mobile_hq.experiment_reverted_recorded'
  )),
  occurred_at TIMESTAMPTZ NOT NULL,
  actor JSONB NOT NULL,
  from_state TEXT NOT NULL CHECK (from_state IN ('suggested', 'drafted', 'accepted', 'rejected', 'applied', 'measured', 'kept', 'reverted', 'extended', 'retest_needed')),
  to_state TEXT NOT NULL CHECK (to_state IN ('suggested', 'drafted', 'accepted', 'rejected', 'applied', 'measured', 'kept', 'reverted', 'extended', 'retest_needed')),
  acceptance_decision_id TEXT REFERENCES experiment_review_decisions(decision_id),
  rollback_ref TEXT,
  evidence_refs JSONB NOT NULL CHECK (jsonb_typeof(evidence_refs) = 'array'),
  business_mutation_called BOOLEAN NOT NULL DEFAULT FALSE CHECK (business_mutation_called = FALSE),
  CHECK (
    (from_state = 'suggested' AND to_state = 'drafted')
    OR (from_state = 'drafted' AND to_state IN ('accepted', 'rejected'))
    OR (from_state = 'accepted' AND to_state = 'applied' AND acceptance_decision_id IS NOT NULL AND rollback_ref IS NOT NULL AND event_name = 'mobile_hq.experiment_applied_recorded')
    OR (from_state = 'applied' AND to_state = 'measured')
    OR (from_state = 'measured' AND to_state IN ('kept', 'extended', 'retest_needed'))
    OR (from_state = 'measured' AND to_state = 'reverted' AND rollback_ref IS NOT NULL AND event_name = 'mobile_hq.experiment_reverted_recorded')
  )
);

CREATE INDEX IF NOT EXISTS idx_experiment_action_lifecycle_store
  ON experiment_action_lifecycle_records (brand_id, store_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS merchant_preference_candidates (
  preference_candidate_id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES experiment_plan_reviews(review_id),
  experiment_plan_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  rejection_decision_id TEXT NOT NULL REFERENCES experiment_review_decisions(decision_id),
  status TEXT NOT NULL CHECK (status = 'candidate_pending_confirmation'),
  candidate_key TEXT NOT NULL,
  candidate_value TEXT NOT NULL,
  reason_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  evidence_refs JSONB NOT NULL CHECK (jsonb_typeof(evidence_refs) = 'array')
);

CREATE TABLE IF NOT EXISTS merchant_preferences (
  preference_id TEXT PRIMARY KEY,
  preference_candidate_id TEXT NOT NULL REFERENCES merchant_preference_candidates(preference_candidate_id),
  brand_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  event_name TEXT NOT NULL CHECK (event_name = 'mobile_hq.merchant_preference_confirmed'),
  status TEXT NOT NULL CHECK (status = 'confirmed'),
  preference_key TEXT NOT NULL,
  preference_value TEXT NOT NULL,
  confirmed_at TIMESTAMPTZ NOT NULL,
  confirmed_by JSONB NOT NULL,
  evidence_refs JSONB NOT NULL CHECK (jsonb_typeof(evidence_refs) = 'array')
);
