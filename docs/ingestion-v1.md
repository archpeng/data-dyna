# Data Dyna Ingestion v1

## Scope

`DD-P0-S2` adds local ingestion handlers for the deterministic Core boundary. The handlers are equivalent to `POST /events` and `POST /events/batch` without committing the repo to an HTTP framework yet.

## Source Paths

- Single event handler: `handlePostEvent` in `src/ingestion/event-handlers.ts`
- Batch handler: `handlePostEventsBatch` in `src/ingestion/event-handlers.ts`
- Raw event store contract: `src/ingestion/raw-event-store.ts`
- Optional PostHog boundary: `src/ingestion/posthog-sink.ts`
- PostgreSQL migration: `migrations/0001_raw_events.sql`
- Validation: `tests/ingestion-handlers.spec.ts`

## Deterministic Boundary

Accepted events must parse through Event Contract v1 before persistence. The raw event record keeps both normalized fields and the original event/properties payload:

- normalized: event ID, idempotency key, source, domain, name, producer service, store/brand IDs, entity type/ID, occurrence/receipt time
- original: `properties` and full `event` JSON

Invalid events are recorded in `invalid_raw_events` shape with receipt time, reason, and original payload. Tests use `InMemoryRawEventStore` so no production database credentials are required.

## Idempotency

`idempotency.key` is the authoritative duplicate key. Repeated events return the original persisted record and do not enqueue another product analytics event.

## PostHog Boundary

PostHog is represented only as an optional asynchronous sink interface. It is not a source of truth and is called only after raw persistence succeeds. If the sink is absent or fails, Core acceptance remains governed by the raw event store.
