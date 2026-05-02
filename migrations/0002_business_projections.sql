CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  brand_id TEXT,
  store_id TEXT,
  member_id TEXT,
  first_event_at TIMESTAMPTZ NOT NULL,
  last_event_at TIMESTAMPTZ NOT NULL,
  source_event_ids TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS carts (
  cart_id TEXT PRIMARY KEY,
  brand_id TEXT,
  store_id TEXT,
  member_id TEXT,
  session_id TEXT,
  status TEXT NOT NULL,
  checkout_started_at TIMESTAMPTZ,
  frontend_attribution_event_ids TEXT[] NOT NULL DEFAULT '{}',
  source_event_ids TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS orders (
  order_id TEXT PRIMARY KEY,
  brand_id TEXT,
  store_id TEXT,
  member_id TEXT,
  status TEXT NOT NULL,
  opened_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  total_amount NUMERIC(14, 2),
  currency TEXT,
  final_fact_source TEXT NOT NULL CHECK (final_fact_source = 'pos'),
  frontend_attribution_event_ids TEXT[] NOT NULL DEFAULT '{}',
  source_event_ids TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS order_items (
  order_item_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id),
  item_id TEXT NOT NULL,
  item_name TEXT,
  quantity NUMERIC(14, 3) NOT NULL,
  amount NUMERIC(14, 2),
  source_event_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  payment_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id),
  brand_id TEXT,
  store_id TEXT,
  amount NUMERIC(14, 2) NOT NULL,
  method TEXT,
  paid_at TIMESTAMPTZ NOT NULL,
  final_fact_source TEXT NOT NULL CHECK (final_fact_source = 'pos'),
  source_event_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refunds (
  refund_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id),
  brand_id TEXT,
  store_id TEXT,
  amount NUMERIC(14, 2) NOT NULL,
  reason TEXT,
  refunded_at TIMESTAMPTZ NOT NULL,
  final_fact_source TEXT NOT NULL CHECK (final_fact_source = 'pos'),
  source_event_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS menus (
  menu_id TEXT PRIMARY KEY,
  brand_id TEXT,
  store_id TEXT,
  menu_name TEXT,
  source_event_ids TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS items (
  item_id TEXT PRIMARY KEY,
  brand_id TEXT,
  store_id TEXT,
  menu_id TEXT REFERENCES menus(menu_id),
  item_name TEXT,
  category TEXT,
  source_event_ids TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS members (
  member_id TEXT PRIMARY KEY,
  brand_id TEXT,
  store_id TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  source_event_ids TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS member_profiles (
  member_id TEXT PRIMARY KEY REFERENCES members(member_id),
  brand_id TEXT,
  store_id TEXT,
  latest_order_id TEXT,
  latest_pay_time TIMESTAMPTZ,
  source_event_ids TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS member_rfm_snapshots (
  member_id TEXT NOT NULL,
  brand_id TEXT NOT NULL,
  store_id TEXT,
  snapshot_date DATE NOT NULL,
  source_table TEXT NOT NULL CHECK (source_table = 'report.crm.member_labels'),
  rfm_tag_30d TEXT NOT NULL,
  rfm_tag_90d TEXT NOT NULL,
  rfm_tag_180d TEXT NOT NULL,
  latest_pay_time TIMESTAMPTZ,
  pay_cnt_90d NUMERIC(14, 3) NOT NULL,
  pay_amount_90d NUMERIC(14, 2) NOT NULL,
  avg_pay_amount_90d NUMERIC(14, 2) NOT NULL,
  PRIMARY KEY (member_id, brand_id, snapshot_date)
);

CREATE TABLE IF NOT EXISTS merchant_actions (
  action_id TEXT PRIMARY KEY,
  experiment_plan_id TEXT NOT NULL,
  brand_id TEXT,
  store_id TEXT,
  merchant_id TEXT,
  action TEXT NOT NULL,
  acted_at TIMESTAMPTZ NOT NULL,
  source_event_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS orders_store_paid_at_idx
  ON orders (store_id, paid_at DESC);

CREATE INDEX IF NOT EXISTS payments_store_paid_at_idx
  ON payments (store_id, paid_at DESC);

CREATE INDEX IF NOT EXISTS member_rfm_snapshots_brand_date_idx
  ON member_rfm_snapshots (brand_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS merchant_actions_store_acted_at_idx
  ON merchant_actions (store_id, acted_at DESC);
