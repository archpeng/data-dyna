# App Adapter Seam

This directory is a production-adapter contract only. It does not implement a runnable HTTP server, PostgreSQL repository, queue worker, runtime config, or observability stack.

## Future adapter surfaces

When a separate production foundation plan owns runtime choices, add adapters here before touching deterministic Core modules:

```text
src/app/http/events-route.ts
src/app/repositories/postgres-raw-event-repository.ts
src/app/workers/projection-worker.ts
src/app/workers/snapshot-worker.ts
src/app/workers/benchmark-worker.ts
src/app/workers/evidence-worker.ts
```

- `/events` and `/events/batch` belong in `src/app/http/events-route.ts`.
- PostgreSQL persistence for raw events belongs in `src/app/repositories/postgres-raw-event-repository.ts`.
- Projection scheduling belongs in `src/app/workers/projection-worker.ts`.
- Snapshot scheduling belongs in `src/app/workers/snapshot-worker.ts`.
- Peer benchmark scheduling belongs in `src/app/workers/benchmark-worker.ts`.
- Evidence rebuild / persistence scheduling belongs in `src/app/workers/evidence-worker.ts`.

## Adapter responsibilities

Adapters own I/O and runtime behavior:

- HTTP request / response mapping and auth context.
- Transaction boundaries and idempotent repository calls.
- Retry policy, dead-letter handling, scheduling, and worker checkpoints.
- Logging, tracing, metrics, and deployment/runtime configuration.
- Calling deterministic Core functions with already-validated inputs.

## Core responsibilities

Current `src/contracts`, `src/ingestion`, `src/projections`, `src/snapshots`, `src/benchmarks`, `src/agent`, `src/merchant-review`, and `src/evidence` modules stay deterministic:

- validate, parse, project, rebuild, assemble, or evaluate data;
- expose pure functions, schemas, and in-memory test seams;
- preserve POS final-fact, Datamesh RFM, aggregate-only benchmark, Agent draft, merchant-confirmation, and non-causal evidence boundaries.

## Forbidden

- Do not put DB clients, HTTP framework objects, queue clients, or runtime config inside current deterministic Core modules.
- Do not move pure functions into app adapters to make I/O convenient.
- Do not let adapters bypass `npm run check:boundaries`, `npm run check:schema-migrations`, Zod schemas, validator gates, or module README contracts.
- Do not claim production readiness until a separate production plan adds real runtime ownership and integration tests.

## Validation

For adapter-seam-only edits, run:

```bash
git diff --check
npm run check:boundaries
npm run check:schema-migrations
npm test
npm run typecheck
```
