# projections

## Owns
- Deterministic rebuild of business projections from accepted raw events and Datamesh RFM rows.

## Inputs
- `RawEventRecord[]` and optional parsed Datamesh member-label rows.

## Outputs
- Sessions, carts, POS orders/payments/refunds, menu/items, members, member profiles, RFM snapshots, and merchant actions.

## Allowed imports
- `src/contracts/**`, `src/ingestion/raw-event-store.ts`, and `src/datamesh/**`.

## Forbidden
- Do not import snapshots, benchmarks, Agent, merchant-review, or evidence modules.
- Do not promote mini-program checkout/cart events into paid order facts; POS remains the final fact source for orders, payments, and refunds.

## Validation
- Run `npm run test:core` and `npm run typecheck`.
