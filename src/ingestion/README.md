# ingestion

## Owns
- Event acceptance/rejection handlers, raw event persistence interface, in-memory raw store, and PostHog sink mapping.

## Inputs
- Unknown single or batch payloads plus `DataDynaEvent` contract parsing.

## Outputs
- Accepted raw-event records, invalid-event records, duplicate detection, and optional analytics sink events.

## Allowed imports
- `src/contracts/**` for event validation and local ingestion helpers/stores.

## Forbidden
- Do not rebuild projections, snapshots, benchmarks, Agent context, merchant review, or evidence from ingestion code.
- Do not treat frontend checkout as a paid order fact; POS events remain the final order/payment fact source downstream.

## Validation
- Run `npm run test:core` and `npm run typecheck`.
