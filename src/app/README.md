# App Adapter Seam

This directory is the production-adapter seam. It now contains the minimal Fastify app/config/server skeleton, P2-lite bearer-token ingestion auth boundary, PostgreSQL raw-event repository, `/events` HTTP adapter routes, and contract-only worker foundation seams, but it still does not implement production queue workers, full IAM/tenancy, deployment, or an observability stack.

## Current runtime foundation decision

`docs/runtime-foundation-decision.md` records the current adapter decisions: Fastify for HTTP, `pg` / node-postgres for PostgreSQL raw-event repositories, and simple script/runner worker entrypoints that may be invoked by cron or an external scheduler. The current app uses Fastify for construction, `/healthz`, `/events`, and `/events/batch`; the current repository seam uses `pg` only under `src/app`; the current worker foundation is contract-only under `src/app/workers`; none of these surfaces claim production deployment, Agent runtime, full IAM/tenancy, queue reliability, or observability readiness.

## Adapter surfaces

Implemented S2/S3/S4/S5 surfaces:

```text
src/app/config/runtime-config.ts
src/app/config/postgres-test-config.ts
src/app/auth/ingestion-auth.ts
src/app/app.ts
src/app/server.ts
src/app/repositories/postgres-raw-event-repository.ts
src/app/http/events-route.ts
src/app/workers/worker-contract.ts
src/app/workers/projection-worker.ts
src/app/workers/snapshot-worker.ts
src/app/workers/benchmark-worker.ts
src/app/workers/evidence-worker.ts
src/app/workers/index.ts
```

- `/events` and `/events/batch` are registered from `src/app/http/events-route.ts` through the Fastify app boundary when a `RawEventStore` is provided.
- PostgreSQL persistence for raw events belongs in `src/app/repositories/postgres-raw-event-repository.ts`.
- Projection scheduling belongs in `src/app/workers/projection-worker.ts`.
- Snapshot scheduling belongs in `src/app/workers/snapshot-worker.ts`.
- Peer benchmark scheduling belongs in `src/app/workers/benchmark-worker.ts`.
- Evidence rebuild / persistence scheduling belongs in `src/app/workers/evidence-worker.ts`.
- Worker files currently export `WorkerContract` descriptors only; broker-backed queueing, retries, checkpoints, dead-letter handling, production scheduling, Agent runtime, and business mutation execution remain unimplemented residuals.

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

For adapter-seam-only edits, run the static and unit gates:

```bash
git diff --check
npm run check:boundaries
npm run check:schema-migrations
npm test
npm run typecheck
```

When local PostgreSQL is available, or when changing `src/app/repositories/**`, `src/app/http/**`, `migrations/**`, or runtime tests, run the runtime integration gate against the migrated local database:

```bash
npm run db:test:up
npm run test:db:migrations
npm run test:app:repository
npm run test:runtime
```

When changing worker seams, also run:

```bash
npm run test:app:workers
```
