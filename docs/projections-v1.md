# Business Projections v1

`DD-P1-S1` turns accepted raw events plus fixture Datamesh RFM rows into deterministic business fact projections.

## Source-truth boundaries

- POS transaction-scene events are the final local source for order, payment, refund, and order-item projections in this MVP proof.
- Mini-program events are behavior and attribution inputs only. `mini_program.checkout_started` can attach `frontendAttributionEventIds` to a later POS order, but it does not create final order/payment/refund facts.
- Datamesh RFM is consumed as snapshot facts from `report.crm.member_labels`; this repo does not recalculate RFM in the MVP.
- `mobile_hq` events project merchant review/adoption actions only; they do not mutate menu, price, coupon, or customer-message state.

## Implemented local proof surfaces

- `migrations/0002_business_projections.sql` defines PostgreSQL-first tables for:
  - `sessions`
  - `carts`
  - `orders`
  - `order_items`
  - `payments`
  - `refunds`
  - `menus`
  - `items`
  - `members`
  - `member_profiles`
  - `member_rfm_snapshots`
  - `merchant_actions`
- `src/datamesh/rfm-member-labels.ts` defines the fixture adapter contract for `report.crm.member_labels`.
- `src/projections/business-projections.ts` defines pure projection rebuild functions and an in-memory projection store/task boundary.
- `tests/projections-dd-p1-s1.spec.ts` proves deterministic projection behavior over raw event and Datamesh fixtures.

## Datamesh RFM contract

The fixture row contract maps these fields without deriving or recalculating tags:

```text
memberStrId -> memberId
brandId -> brandId
storeId -> storeId (optional)
snapshotDate -> snapshotDate
rfm_tag.rfm_tag_30d -> rfmTag30d
rfm_tag.rfm_tag_90d -> rfmTag90d
rfm_tag.rfm_tag_180d -> rfmTag180d
metrics.latest_pay_time -> latestPayTime
metrics_90d.pay_cnt_90d -> payCnt90d
metrics_90d.pay_amount_90d -> payAmount90d
metrics_90d.avg_pay_amount_90d -> avgPayAmount90d
```

Live Datamesh credentials are intentionally out of scope for this slice.

## Rebuild semantics

`rebuildBusinessProjections` is idempotent by design: it reconstructs all projection rows from the supplied raw events and RFM rows, sorted by deterministic keys, without mutating source inputs. `runProjectionRebuildTask` writes the full rebuilt snapshot through a `ProjectionStore.replaceAll` boundary so a later PostgreSQL worker can use the same replace-all or transactional upsert semantics.

## Residuals

- Production Datamesh connectivity should be a later deployment/integration slice.
- Live PostgreSQL worker wiring can reuse the current pure rebuild/task boundary after storage credentials and migration execution are in scope.
- External producer SDK instrumentation remains outside this repo until a later explicit cross-repo workset authorizes it.
