# Independent Café Snapshots v1

`DD-P1-S2` adds deterministic snapshot facts for independent cafés. These snapshots consume `DD-P1-S1` `BusinessProjections`; they do not call live services and do not ask an LLM to classify stores or compute metrics.

## Source boundaries

- Store profiles are rebuilt from projected menus, items, paid POS orders, and Datamesh RFM snapshots.
- Segment candidates are deterministic projection-rule outputs. The current first label is `independent_cafe_core`.
- Merchant confirmations are explicit fixtures/events and are stored separately from inferred segment candidates.
- Metric snapshots cite projection inputs and evidence refs; they are not dashboard-only aggregates.

## Implemented surfaces

- `migrations/0003_independent_cafe_snapshots.sql`
- `src/snapshots/independent-cafe-snapshots.ts`
- `tests/snapshots-dd-p1-s2.spec.ts`

## Tables

`0003_independent_cafe_snapshots.sql` defines:

1. `store_profile_snapshots`
2. `metric_snapshots`
3. `restaurant_segments`
4. `merchant_confirmations`

The SQL keeps restaurant category scoped to `independent_cafe` and segment classification scoped to `deterministic_projection_rule`.

## First metric definitions

| Metric | Numerator | Denominator | Window | Owner/source | Guardrail relation |
|---|---|---|---|---|---|
| `repurchase_90d_rate` | Members in `member_rfm_snapshots` with `payCnt90d >= 2` | Members in `member_rfm_snapshots` with `payCnt90d >= 1` | `90d` | `data-dyna-core` / `member_rfm_snapshots` | `growth_metric` |
| `avg_order_value` | Sum of POS-paid order `totalAmount` | Count of POS-paid orders | `snapshot` | `data-dyna-core` / `orders` | `growth_metric` |
| `refund_rate` | Count of POS refund records | Count of POS-paid orders | `snapshot` | `data-dyna-core` / `refunds`, `orders` | `negative_guardrail` |
| `checkout_started_cart_rate` | Carts with `checkout_started` status | All observed carts | `snapshot` | `data-dyna-core` / `carts` | `funnel_metric` |

Each metric definition includes `numerator`, `denominator`, `window`, `owner`, `source`, `projectionInputRefs`, and `guardrailRelation` in code.

## Segment candidate contract

A restaurant segment candidate carries:

- `label`
- `confidence`
- `evidenceRefs`
- `confirmationStatus`
- `classificationMethod = deterministic_projection_rule`

The first deterministic rule only emits the independent-café candidate for a store/snapshot from projection evidence. Merchant confirmation can set `confirmed` or `rejected`, but unconfirmed deterministic evidence is not treated as a permanent merchant preference.

## Non-goals

- No full BI dashboard scope.
- No mixed all-餐饮 benchmark pool.
- No LLM-only segment classification.
- No permanent inferred merchant preference without explicit confirmation.
