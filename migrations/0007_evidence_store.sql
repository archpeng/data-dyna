-- DD-P5-S1 Evidence Store
-- Deterministic effect/guardrail/evidence facts. Directional before/after only; no causal proof or LLM-authored facts.

CREATE TABLE IF NOT EXISTS action_effects (
  action_effect_id TEXT PRIMARY KEY,
  experiment_plan_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  metric_id TEXT NOT NULL CHECK (metric_id IN ('repurchase_90d_rate', 'avg_order_value', 'refund_rate', 'checkout_started_cart_rate')),
  before_metric_snapshot_id TEXT NOT NULL,
  after_metric_snapshot_id TEXT NOT NULL,
  before_value NUMERIC,
  after_value NUMERIC,
  delta_value NUMERIC,
  delta_ratio NUMERIC,
  direction TEXT NOT NULL CHECK (direction IN ('higher_is_better', 'lower_is_better')),
  sample_status TEXT NOT NULL CHECK (sample_status IN ('sufficient', 'weak_sample', 'needs_more_data')),
  confidence_label TEXT NOT NULL CHECK (confidence_label IN ('medium', 'low', 'needs_more_data')),
  outcome TEXT NOT NULL CHECK (outcome IN ('improved', 'unchanged', 'degraded', 'needs_more_data')),
  interpretation TEXT NOT NULL CHECK (interpretation IN ('directional_before_after_non_causal', 'needs_more_data_missing_or_weak_sample')),
  evidence_refs JSONB NOT NULL CHECK (jsonb_array_length(evidence_refs) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guardrail_results (
  guardrail_result_id TEXT PRIMARY KEY,
  experiment_plan_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  metric_id TEXT NOT NULL CHECK (metric_id IN ('repurchase_90d_rate', 'avg_order_value', 'refund_rate', 'checkout_started_cart_rate')),
  relation TEXT NOT NULL CHECK (relation IN ('must_not_degrade', 'monitor_only')),
  before_metric_snapshot_id TEXT NOT NULL,
  after_metric_snapshot_id TEXT NOT NULL,
  before_value NUMERIC,
  after_value NUMERIC,
  delta_value NUMERIC,
  direction TEXT NOT NULL CHECK (direction IN ('higher_is_better', 'lower_is_better')),
  sample_status TEXT NOT NULL CHECK (sample_status IN ('sufficient', 'weak_sample', 'needs_more_data')),
  confidence_label TEXT NOT NULL CHECK (confidence_label IN ('medium', 'low', 'needs_more_data')),
  outcome TEXT NOT NULL CHECK (outcome IN ('passed', 'degraded', 'observed', 'needs_more_data')),
  interpretation TEXT NOT NULL CHECK (interpretation IN ('directional_before_after_non_causal', 'needs_more_data_missing_or_weak_sample')),
  evidence_refs JSONB NOT NULL CHECK (jsonb_array_length(evidence_refs) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS intervention_trajectories (
  intervention_trajectory_id TEXT PRIMARY KEY,
  experiment_plan_id TEXT NOT NULL,
  review_id TEXT NOT NULL,
  acceptance_decision_id TEXT NOT NULL,
  applied_lifecycle_record_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  primary_action_effect_id TEXT NOT NULL,
  guardrail_result_ids JSONB NOT NULL,
  adoption_refs JSONB NOT NULL CHECK (jsonb_array_length(adoption_refs) > 0),
  overall_verdict TEXT NOT NULL CHECK (overall_verdict IN ('clean_success', 'mixed_guardrail_degraded', 'no_clear_lift', 'needs_more_data')),
  interpretation TEXT NOT NULL CHECK (interpretation IN ('directional_before_after_non_causal', 'needs_more_data_missing_or_weak_sample')),
  evidence_refs JSONB NOT NULL CHECK (jsonb_array_length(evidence_refs) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evidence_records (
  evidence_record_id TEXT PRIMARY KEY,
  intervention_trajectory_id TEXT NOT NULL,
  segment_ref TEXT NOT NULL,
  opportunity_gap_id TEXT NOT NULL,
  experiment_plan_id TEXT NOT NULL,
  outcome_ref TEXT NOT NULL,
  guardrail_refs JSONB NOT NULL,
  adoption_refs JSONB NOT NULL CHECK (jsonb_array_length(adoption_refs) > 0),
  verdict TEXT NOT NULL CHECK (verdict IN ('clean_success', 'mixed_guardrail_degraded', 'no_clear_lift', 'needs_more_data')),
  interpretation TEXT NOT NULL CHECK (interpretation IN ('directional_before_after_non_causal', 'needs_more_data_missing_or_weak_sample')),
  evidence_refs JSONB NOT NULL CHECK (jsonb_array_length(evidence_refs) > 0),
  reproducible_input_refs JSONB NOT NULL CHECK (jsonb_array_length(reproducible_input_refs) > 0),
  llm_generated_claims JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (llm_generated_claims = '[]'::jsonb),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_effects_plan ON action_effects (experiment_plan_id);
CREATE INDEX IF NOT EXISTS idx_guardrail_results_plan ON guardrail_results (experiment_plan_id);
CREATE INDEX IF NOT EXISTS idx_intervention_trajectories_plan ON intervention_trajectories (experiment_plan_id);
CREATE INDEX IF NOT EXISTS idx_evidence_records_gap ON evidence_records (opportunity_gap_id);
