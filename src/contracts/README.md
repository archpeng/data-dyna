# contracts

## Owns
- `event-contract.v1` Zod schemas and TypeScript types for producer events.

## Inputs
- Unknown event payloads from mini program, POS, mobile HQ, Datamesh, and system producers.

## Outputs
- Parsed `DataDynaEvent` values with version, source, domain, identity, correlation, entity, properties, and idempotency fields.

## Allowed imports
- Runtime schema libraries such as `zod`.

## Forbidden
- Do not import ingestion, projection, snapshot, benchmark, Agent, review, or evidence business modules.
- Do not add producer-specific side effects or storage behavior here.

## Validation
- Run `npm run test:contracts` and `npm run typecheck`.
