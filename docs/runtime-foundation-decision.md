# Runtime Foundation Decision

Status: recorded for `DD-RUNTIME-S1` review
Date: 2026-05-03
Scope: minimal production runtime foundation for `data-dyna`; this is not full production deployment, Agent runtime, auth, tenancy, or observability completion.

## Decision summary

| Surface | Decision | Rationale |
|---|---|---|
| HTTP framework | Fastify | Small dependency surface, direct route registration, strong async request handling, and simple testability fit the current `/events` and `/events/batch` adapter need without introducing a large module/DI framework. |
| DB client | `pg` / node-postgres | The DB gate already uses PostgreSQL and `pg`; the raw-event repository can implement the existing `RawEventStore` contract directly against migrated tables without adding an ORM or moving DB concerns into Core. |
| Worker mode | Simple script/runner entrypoints, optionally invoked by cron or an external scheduler | The foundation only needs clear worker seams for projection/snapshot/benchmark/evidence jobs. A broker-backed queue, retries, checkpoints, and dead-letter semantics remain deferred until production operating requirements exist. |

No runtime dependencies or framework-specific code were added in the decision slice itself. Later implementation slices own package changes and code.

## Fastify vs NestJS

| Criterion | Fastify | NestJS |
|---|---|---|
| Fit for current scope | Directly supports a small HTTP app with two ingestion routes and local integration tests. | Optimized for a larger application module graph than this foundation currently needs. |
| Boundary preservation | Keeps HTTP objects in `src/app` adapters and makes it easy to call existing deterministic handlers. | Encourages framework modules/providers that can obscure the current Core vs adapter boundary if introduced too early. |
| Dependency and build impact | One primary runtime framework dependency; works naturally with the repo's TypeScript/ESM shape. | Requires Nest core packages plus decorator/reflection conventions and a broader app structure. |
| Test strategy | Route-level tests can use Fastify app construction/injection before production deployment exists. | Test harness is heavier and favors Nest module construction even for simple routes. |
| Future extensibility | Enough for local runtime, route registration, and later plugin-based middleware if accepted. | Stronger if future requirements demand a large opinionated service platform, but those requirements are not present in this pack. |

Decision: choose Fastify for the runtime foundation. If future production non-functional requirements require NestJS-style modules, DI, or a broader service platform, that should be a new replan rather than hidden scope expansion in this pack.

## Package dependency plan

Current package state after the S2/S3/S4/S5 implementation slices:

- `zod` remains the event contract validation runtime dependency.
- `fastify` is a runtime dependency for the app/server skeleton and `/events` route adapter.
- `pg` is a runtime dependency for `src/app/repositories/postgres-raw-event-repository.ts` and the local/CI DB gate scripts.
- `tsx`, `typescript`, and `@types/node` remain dev/test tooling.
- `DD-RUNTIME-S5` adds no new runtime dependency; worker foundation files are contract-only TypeScript descriptors.

Runtime dependency boundaries:

1. Keep `fastify` and `pg` under app-adapter ownership; do not import them from deterministic Core modules.
2. Do not add NestJS packages, queue clients, auth libraries, OpenTelemetry packages, or deployment tooling in this foundation unless a later slice explicitly owns and tests that scope.

Planned dev/test dependency handling:

- Keep `tsx`, `typescript`, and `@types/node` as dev dependencies.
- Add test-only helpers under `devDependencies` only if a later slice proves they are needed for local PostgreSQL or HTTP integration tests.
- `DD-RUNTIME-S6` consolidates `npm run test:runtime` as the local PostgreSQL-backed route/repository integration gate; run it after `npm run test:db:migrations` so the database schema is freshly migrated.

## Worker foundation mode

`DD-RUNTIME-S5` records simple script/runner seams under `src/app/workers/**` as contract-only descriptors. Future executable entrypoints may be invoked manually, by npm scripts, or by a cron-style/system scheduler in local or deployment-specific environments only after a later slice owns the required repository, lifecycle, and reliability semantics.

Current worker foundation files:

- `src/app/workers/projection-worker.ts` — projection rebuild ownership boundary.
- `src/app/workers/snapshot-worker.ts` — independent-café snapshot rebuild ownership boundary.
- `src/app/workers/benchmark-worker.ts` — aggregate-only benchmark/opportunity-gap ownership boundary.
- `src/app/workers/evidence-worker.ts` — evidence rebuild ownership boundary after merchant adoption and before/after metrics already exist.

Deferred worker scope:

- no broker-backed queue in this pack;
- no production retry, checkpoint, or dead-letter guarantees unless a later slice implements and tests them;
- no production scheduler, deployment lifecycle, or observability ownership from these descriptors;
- no Agent runtime execution from workers;
- no merchant-review side effects or business mutation execution from workers.

## Adapter boundary consequences

- Fastify app and route registration belong under `src/app`, for example `src/app/http/events-route.ts` plus app/server construction in `DD-RUNTIME-S2` and `DD-RUNTIME-S4`.
- PostgreSQL clients belong under `src/app` repository/config seams only; do not import them from `src/ingestion`, `src/contracts`, `src/projections`, `src/snapshots`, `src/benchmarks`, `src/agent`, `src/merchant-review`, or `src/evidence`.
- Existing deterministic handlers remain the source of ingestion semantics: `handlePostEvent`, `handlePostEventsBatch`, `DataDynaEventSchema`, and `RawEventStore`.
- `src/app` adapters map HTTP/database/runtime concerns to existing Core interfaces; they must not move deterministic Core functions into app code.

## Explicit non-goals and residuals

This decision does not complete or claim:

- full production deployment;
- production auth, tenancy, rate limiting, or gateway policy;
- mature observability, tracing, alerting, runbooks, or rollback policy;
- full Agent runtime or real Pi provider integration;
- external producer instrumentation;
- queue retry/dead-letter/checkpoint semantics;
- projection/snapshot/benchmark/evidence repositories beyond the future worker seams.

These residuals remain for later plans or later accepted slices.