# data-dyna Production Runtime Foundation Plan

## Goal

Wrap the existing deterministic Data Core with a minimal production runtime foundation: choose the HTTP framework, implement `/events` and `/events/batch`, implement a PostgreSQL raw-event repository, add the smallest worker runtime foundation, and prove the path with local PostgreSQL integration tests while explicitly excluding full Agent runtime integration.

## Prerequisite

This pack was queued behind `data-dyna-db-migration-execution-gate` and is now active because the DB gate reached `PACK_COMPLETE` with accepted local/CI PostgreSQL migration evidence. Runtime slices depend on the local/CI PostgreSQL substrate and migration runner delivered by that pack.

## Scope

In scope:

- Make an explicit Fastify vs NestJS decision with rationale and consequences.
- Add minimal runtime config and app entry boundaries without moving Core code.
- Implement a PostgreSQL raw event repository behind the existing `RawEventStore` interface.
- Implement `/events` and `/events/batch` HTTP adapters that call deterministic ingestion handlers.
- Add a minimal worker foundation for future projection/snapshot/benchmark/evidence jobs without full queue complexity unless explicitly selected.
- Add local PostgreSQL-backed integration tests for API + repository behavior.

## Non-Goals

- No full Agent runtime, real Pi provider integration, prompt execution, or agent sidecar production deployment.
- No external producer repo instrumentation.
- No production cloud deployment, auth provider, tenancy policy, or observability stack beyond minimal local/logging seams.
- No broad rewrite of deterministic Core modules.
- No direct business mutation tools or merchant lifecycle expansion.

## Deliverables

1. Runtime framework decision doc and package dependency decision.
2. Minimal app/config/server boundary under `src/app`.
3. PostgreSQL raw event repository implementing `RawEventStore`.
4. HTTP `/events` and `/events/batch` adapters that use existing ingestion handlers.
5. Minimal worker foundation and explicit residuals for full queue/retry/dead-letter production behavior.
6. Local PostgreSQL integration test proving migrations + repository + route ingestion path.
7. Closeout audit preserving residuals for full production hardening and Agent runtime.

## Verification

Expected implementation verification as commands become available:

```bash
npm run check:boundaries
npm run check:schema-migrations
npm run test:db:migrations
npm run test:runtime
npm test
npm run typecheck
git diff --check
plan_sync /home/peng/dt-git/github/data-dyna/docs/plan
```

If the selected framework or DB client introduces new commands, update this verification ladder in the same slice that introduces them.

## Source Documents

- `src/app/README.md` adapter seam contract.
- `src/ingestion/raw-event-store.ts` and `src/ingestion/event-handlers.ts`.
- `src/contracts/event-contract.ts`.
- `migrations/0001_raw_events.sql` and DB gate outputs.
- `docs/current-architecture-and-vibecoding-review.md` sections 8-11.
- `docs/human-critical-review-policy.md`.

## Continuous Wave Ladder

```text
DD-RUNTIME-S1 framework/runtime decision
  -> DD-RUNTIME-S2 app config and server skeleton
  -> DD-RUNTIME-S3 PostgreSQL raw event repository
  -> DD-RUNTIME-S4 /events HTTP adapter
  -> DD-RUNTIME-S5 minimal worker foundation
  -> DD-RUNTIME-S6 runtime integration test gate
  -> DD-RUNTIME-CLOSEOUT-S1 production runtime foundation audit
  -> PACK_COMPLETE terminal parser state
```

Accepted review of each stage activates the next stage in this order. Do not start full Agent runtime or external producer integration from this pack.

## Slice Definitions

#### `DD-RUNTIME-S1` — framework/runtime decision

- Owner: `execute-plan`
- State: `READY`
- Priority: `highest`

目标：

- Make the Fastify vs NestJS decision explicit before adding runtime dependencies or framework-specific code.

交付物：

1. Short decision doc, for example `docs/runtime-foundation-decision.md`, comparing Fastify and NestJS for current repo needs.
2. Chosen framework, DB client, and worker mode recorded with rationale.
3. Package dependency plan that distinguishes runtime dependencies from dev/test dependencies.
4. Updated `src/app/README.md` pointer if the decision changes adapter expectations.

done_when:

1. The repo records one chosen HTTP framework and why it fits the current minimal runtime foundation.
2. The decision explicitly states whether worker foundation uses a simple script/runner, cron-style entrypoint, or queue, and what remains deferred.
3. The decision does not claim full production deployment, Agent runtime, auth, or observability is complete.
4. `git diff --check`, `npm run check:boundaries`, `npm run check:schema-migrations`, and `npm run typecheck` pass.

stop_boundary:

1. Stop if choosing Fastify vs NestJS requires unprovided production non-functional requirements.
2. Stop before adding runtime dependencies without a recorded decision.
3. Stop if the decision would require moving deterministic Core functions into `src/app`.

必须避免：

1. Do not silently pick a framework without tradeoff notes.
2. Do not overbuild a framework module system beyond `/events` and minimal worker foundation.
3. Do not start Agent runtime integration in this decision slice.

#### `DD-RUNTIME-S2` — app config and server skeleton

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `high`

目标：

- Add the smallest app/config/server boundary for the chosen framework while keeping Core deterministic.

交付物：

1. Minimal `src/app/config` and server/app entry files for the chosen framework.
2. Package scripts for local runtime start if appropriate.
3. Health/readiness route or minimal boot probe only if needed for integration tests.
4. Tests or probes proving the app can be constructed without connecting to production resources.

done_when:

1. Runtime config reads only local/test environment variables and validates missing values clearly.
2. App construction does not import DB clients into deterministic Core modules.
3. No production deployment, auth provider, or observability stack is claimed complete.
4. `npm run check:boundaries`, `npm run typecheck`, `npm test`, and `git diff --check` pass.

stop_boundary:

1. Stop if server setup requires production secrets or deployment decisions.
2. Stop if framework wiring requires weakening boundary checks.
3. Stop before adding broad unrelated infrastructure or logging frameworks.

必须避免：

1. Do not create fake production readiness.
2. Do not move existing pure functions into app adapters.
3. Do not add Agent runtime or external producer integration.

#### `DD-RUNTIME-S3` — PostgreSQL raw event repository

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `highest`

目标：

- Implement PostgreSQL persistence for accepted and invalid raw events behind the existing `RawEventStore` contract.

交付物：

1. `src/app/repositories/postgres-raw-event-repository.ts` or equivalent.
2. Repository constructor/connection seam that uses test/local config without leaking DB clients into Core modules.
3. Idempotent insert behavior matching `InMemoryRawEventStore` duplicate semantics.
4. Repository-focused integration tests against local PostgreSQL.

done_when:

1. The repository implements `persistAccepted` and `persistInvalid` using migrated PostgreSQL tables.
2. Duplicate idempotency keys return existing records without double-writing accepted events.
3. Invalid payload persistence preserves reason and payload safely.
4. `npm run test:db:migrations`, repository integration test command, `npm run check:boundaries`, `npm test`, `npm run typecheck`, and `git diff --check` pass.

stop_boundary:

1. Stop if repository implementation requires changing event contract semantics.
2. Stop if transaction/idempotency behavior cannot be proven with local PostgreSQL.
3. Stop before adding production connection pooling/secrets policy beyond local/test needs.

必须避免：

1. Do not put Postgres clients inside `src/ingestion` or other deterministic Core modules.
2. Do not weaken idempotency to simplify SQL.
3. Do not mix projection/snapshot/evidence repositories into this raw-event slice.

#### `DD-RUNTIME-S4` — `/events` HTTP adapter

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `high`

目标：

- Implement `/events` and `/events/batch` HTTP adapters that wrap existing ingestion handlers and PostgreSQL raw-event repository.

交付物：

1. `src/app/http/events-route.ts` or chosen-framework equivalent.
2. Route registration in the app/server boundary.
3. Response mapping for accepted, duplicate, invalid, and batch mixed results.
4. API integration test using local PostgreSQL and migrated schema.

done_when:

1. `POST /events` accepts valid `DataDynaEvent` payloads and persists through `PostgresRawEventRepository`.
2. `POST /events` rejects invalid payloads with the existing deterministic ingestion semantics.
3. `POST /events/batch` preserves current batch handler semantics.
4. `npm run test:runtime`, `npm run check:boundaries`, `npm test`, `npm run typecheck`, and `git diff --check` pass.

stop_boundary:

1. Stop if auth/tenant policy must be decided before a safe local API can exist.
2. Stop if route behavior requires changing Core validation schemas.
3. Stop before adding full production gateway/rate-limit/observability work.

必须避免：

1. Do not bypass Zod event contracts.
2. Do not make HTTP route code the source of business truth.
3. Do not add Agent or merchant-review side effects to `/events`.

#### `DD-RUNTIME-S5` — minimal worker foundation

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `medium`

目标：

- Add the smallest worker runtime foundation for future projection/snapshot/benchmark/evidence jobs without implementing full Agent runtime or overcommitting queue semantics.

交付物：

1. Worker mode documented from `DD-RUNTIME-S1` and reflected under `src/app/workers`.
2. Minimal worker entrypoint or contract for projection/snapshot/benchmark/evidence scheduling boundaries.
3. Clear retry/checkpoint/dead-letter residuals if not implemented in this foundation.
4. Test/probe proving worker files do not import forbidden Core internals or Agent runtime.

done_when:

1. Future executors can identify where projection, snapshot, benchmark, and evidence workers belong.
2. The worker foundation does not claim full queue, retry, dead-letter, or production scheduling readiness unless implemented and tested.
3. Worker code does not import DB clients into deterministic Core modules and does not run Agent runtime.
4. `npm run check:boundaries`, `npm run typecheck`, `npm test`, and `git diff --check` pass.

stop_boundary:

1. Stop if selecting a real queue system requires production operating requirements not in this pack.
2. Stop if worker implementation requires repositories beyond raw events and no slice owns them.
3. Stop before implementing full Agent runtime or business mutation execution.

必须避免：

1. Do not create fake workers that appear production-ready without retry/checkpoint ownership.
2. Do not wire Agent execution into worker flow.
3. Do not hide unimplemented queue semantics behind optimistic docs.

#### `DD-RUNTIME-S6` — runtime integration test gate

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `high`

目标：

- Provide the minimal integration proof that local PostgreSQL, migrations, repository, and `/events` route work together.

交付物：

1. `npm run test:runtime` or equivalent integration test command.
2. Test setup that runs against migrated local PostgreSQL and isolates state.
3. Assertions for valid event persistence, duplicate idempotency, invalid payload persistence, and batch behavior.
4. Validation docs that tell future AI coders when to run runtime tests.

done_when:

1. Runtime integration test command passes against local PostgreSQL.
2. Test covers valid `/events`, duplicate `/events`, invalid `/events`, and `/events/batch` behavior.
3. Existing static checks, DB migration gate, full tests, and typecheck still pass.
4. `git diff --check` and `plan_sync docs/plan` pass.

stop_boundary:

1. Stop if integration proof requires external services beyond local PostgreSQL.
2. Stop if failures reveal migration or Core contract drift that exceeds this slice.
3. Stop before broad production deployment or CI rewrites not already accepted.

必须避免：

1. Do not skip integration tests when DB is available.
2. Do not replace unit tests with runtime tests.
3. Do not claim end-to-end Agent or external producer coverage.

#### `DD-RUNTIME-CLOSEOUT-S1` — production runtime foundation audit

- Owner: `execution-reality-audit`
- State: `QUEUED`
- Priority: `medium`

目标：

- Audit the runtime foundation and preserve the boundary between minimal production runtime and deferred Agent/production hardening work.

交付物：

1. Reality audit over framework decision, app skeleton, raw repository, `/events` routes, worker foundation, and runtime integration tests.
2. Updated plan status and architecture docs if runtime recommendations moved from future to implemented.
3. Residual list for full auth/tenancy, observability, queue hardening, deployment, Agent runtime, and external producer integration.
4. Terminal writeback to `PACK_COMPLETE` only after accepted evidence.

done_when:

1. README/PLAN/STATUS/WORKSET agree on terminal state or next active pack.
2. All runtime foundation slices have evidence or explicit residuals.
3. `npm run test:runtime`, `npm run test:db:migrations`, `npm run check:boundaries`, `npm run check:schema-migrations`, `npm test`, `npm run typecheck`, `git diff --check`, and `plan_sync docs/plan` pass or documented residuals explain unavailable checks.
4. No full Agent runtime, external producer integration, or production deployment is claimed complete.

stop_boundary:

1. Stop if any accepted runtime slice lacks proof and cannot be audited.
2. Stop if full Agent runtime or external integration starts during closeout.
3. Stop if parser truth still names any active slice other than `PACK_COMPLETE` after terminal writeback.

必须避免：

1. Do not mark production runtime complete while auth/tenancy/deployment/observability residuals remain hidden.
2. Do not create a second control-plane root.
3. Do not claim AI Agent runtime readiness.

#### `PACK_COMPLETE` — terminal parser state

- Owner: `closeout`
- State: `DONE`
- Priority: `terminal`

目标：

- Represent production runtime foundation completion only after all non-deferred runtime slices have accepted review evidence.

交付物：

1. README `Current Active Slice` is `PACK_COMPLETE` for this pack.
2. WORKSET `Active Stage` is `PACK_COMPLETE` with owner `closeout` and state `DONE`.
3. Residual hardening and Agent-runtime follow-up are preserved.

done_when:

1. All non-deferred runtime stages have accepted review evidence or explicit residuals.
2. README/PLAN/STATUS/WORKSET parse as terminal `PACK_COMPLETE` truth.
3. Repo-local closeout has preserved validation evidence and residual handoff.

stop_boundary:

1. Stop if any previous stage lacks accepted review evidence.
2. Stop if terminal state would hide Agent/runtime/deployment residuals.
3. Stop if parser truth still names any active slice other than `PACK_COMPLETE`.

必须避免：

1. Do not use wave count as completion proof.
2. Do not mark complete before closeout audit acceptance.

## Exit Criteria

- `/events` and `/events/batch` run through the chosen HTTP framework and existing ingestion handlers.
- PostgreSQL raw-event repository persists accepted and invalid events with idempotency proof.
- Local PostgreSQL and migration gate are used in runtime integration tests.
- Worker foundation is explicit without fake full queue readiness.
- Full Agent runtime remains deferred to a separate plan.
