# data-dyna Auth / Tenancy Foundation Plan

## Objective

Create the P2-lite auth/tenancy foundation required before Data Dyna accepts real producer traffic.

This pack starts from the completed P1-lite Docker/testable runtime. It keeps the architecture simple: one explicit request identity boundary, one tenant identity contract, tenant-safe `/events` writes, and negative tests that prove cross-tenant requests cannot contaminate data.

## Source Truth

- `docs/roadmap/data-dyna-production-readiness-roadmap.md` section P2
- `docs/plan/data-dyna-production-readiness-master_PLAN.md`
- `docs/plan/data-dyna-testable-runtime-deployment_STATUS.md`
- `src/contracts/event-contract.ts`
- `migrations/0001_raw_events.sql`
- `src/app/http/events-route.ts`
- `src/app/repositories/postgres-raw-event-repository.ts`
- `src/ingestion/raw-event-store.ts`
- `docs/deployment/testable-runtime-deployment.md`

## P2 Scope

Must deliver:

1. A documented P2-lite auth model for `/events` and `/events/batch`.
2. A tenant identity contract covering merchant/store/producer/source/environment.
3. Runtime request authentication that rejects missing or invalid credentials.
4. Tenant-safe accepted-event persistence and invalid-event handling.
5. Cross-tenant negative tests, including idempotency collision safety.
6. Environment/runbook updates for local/test credentials without committing production secrets.

Non-goals:

- Full IAM, OAuth, SSO, self-service merchant permissions, or admin UI.
- Real producer integration; P4 owns producer adapters and mappings.
- Mature observability; P3 owns structured logs, metrics, alerts, dashboards, and traces.
- Durable worker queue; P5 owns retry/checkpoint/dead-letter semantics.
- Agent permissions; P6 owns Agent runtime and governance.
- Cloud secret-management implementation; this pack documents seams and keeps secrets out of git.

## Stage Definitions

#### `DD-P2-S1` — auth/tenancy contract and implementation map

- Owner: `execute-plan`
- State: `READY`
- Priority: `critical`

目标：

- Write the P2-lite source-of-truth contract before coding auth behavior, so request identity, tenant identity, schema impact, and test expectations are explicit.

交付物：

1. `docs/security/auth-tenancy-foundation.md` defining the minimal auth model, accepted credential shape, tenant identity source, request failure behavior, and local/test env variables.
2. A concrete implementation map naming the exact files/surfaces later P2 slices may change.
3. Explicit decisions for `merchantId`, `storeId`, `producer.service`, `producer.environment`, `source`, and idempotency scope safety.
4. Validation ladder for P2 implementation and review.

done_when:

1. `docs/security/auth-tenancy-foundation.md` exists and defines the canonical P2-lite auth/tenancy contract.
2. The contract explains how missing credentials, invalid credentials, tenant mismatch, missing tenant identity, and idempotency collisions must behave.
3. The contract names allowed implementation surfaces and preserves P3/P4/P5/P6 residuals.
4. `npm run check:plan` and `git diff --check` pass.

stop_boundary:

1. Stop if the contract requires full IAM, OAuth, SSO, admin UI, or external secret infrastructure.
2. Stop if the contract would admit real producer traffic before tenant-safe writes are implemented and tested.
3. Stop if schema decisions require migration changes not captured for `DD-P2-S2`.

必须避免：

1. Do not implement runtime auth in this slice unless required to make the contract testable and still bounded.
2. Do not invent compatibility aliases for multiple credential systems.
3. Do not hide P3/P4/P5/P6 residuals.

#### `DD-P2-S2` — tenant storage and idempotency safety

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `critical`

目标：

- Make raw event storage capable of tenant-safe writes and idempotency behavior according to the accepted P2 contract.

交付物：

1. Migration or repository updates needed to persist canonical tenant/audit fields.
2. Idempotency uniqueness semantics that cannot let one tenant collide with or read another tenant's accepted event.
3. Repository and migration tests proving tenant fields, constraints, and duplicate behavior.
4. No deterministic Core import of Fastify, `pg` pool construction, or auth framework code.

done_when:

1. Migration/storage changes implement the accepted P2 tenant/idempotency contract.
2. Repository tests prove tenant field persistence and cross-tenant idempotency collision safety.
3. `npm run test:db:migrations`, `npm run test:app:repository`, `npm run check:schema-migrations`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if existing raw event data compatibility requires a broader migration strategy than this P2-lite pack owns.
2. Stop if idempotency behavior cannot be made tenant-safe without changing the event contract.
3. Stop if schema changes touch projection/snapshot/benchmark/evidence ownership outside raw event tenancy.

必须避免：

1. Do not add a general ORM or DI framework.
2. Do not implement producer adapters or worker queues in this slice.

#### `DD-P2-S3` — runtime request auth boundary

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `critical`

目标：

- Add the smallest runtime auth boundary for `/events` and `/events/batch` based on the accepted P2 contract.

交付物：

1. Minimal `src/app/auth/**` or equivalent app-layer auth module.
2. Route integration that rejects missing/invalid credentials before accepted event persistence.
3. Local/test env contract updates with placeholder credentials only.
4. Runtime tests for missing credential, invalid credential, and accepted credential behavior.

done_when:

1. `/events` and `/events/batch` reject missing or invalid credentials with the contract-defined status/error shape.
2. Authorized local/test requests still pass existing runtime behavior for valid, duplicate, invalid, and batch events.
3. `npm run test:runtime`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if external identity provider integration becomes required.
2. Stop if route auth logic needs real producer integration or network calls.
3. Stop if auth code leaks token values into logs, errors, tests, or docs beyond placeholders.

必须避免：

1. Do not add OAuth/SSO/IAM framework complexity.
2. Do not weaken existing runtime smoke behavior without updating the smoke gate in `DD-P2-S5`.

#### `DD-P2-S4` — tenant-safe event writes and negative tests

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `critical`

目标：

- Enforce tenant-safe accepted-event writes from authenticated request identity through ingestion and PostgreSQL persistence.

交付物：

1. Runtime behavior that rejects or records tenant mismatch exactly as the accepted contract specifies.
2. Tests proving tenant A credentials cannot write tenant B events.
3. Tests proving missing/malformed tenant identity cannot become an accepted event silently.
4. Tests proving batch behavior remains safe when valid and invalid tenant-scoped events are mixed.

done_when:

1. Cross-tenant write attempts fail or persist as invalid according to the contract, and do not create accepted raw events.
2. Tenant-safe accepted writes persist the expected merchant/store/producer identity.
3. `npm run test:runtime`, `npm run test:db:migrations`, `npm run check:boundaries`, `npm run check:schema-migrations`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if tenant mismatch semantics conflict with the existing event contract and need replan.
2. Stop if producer identity must be sourced from external systems not present in this repo.
3. Stop if implementation starts P4 producer adapters instead of tenant-safe runtime writes.

必须避免：

1. Do not let invalid tenant events silently enter `raw_events`.
2. Do not conflate test tenant credentials with production secrets.

#### `DD-P2-S5` — P2 runtime smoke and runbook update

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `high`

目标：

- Update the existing Docker/test runtime smoke path so P2 auth/tenancy behavior is reproducible by a fresh developer.

交付物：

1. `scripts/smoke-runtime.mjs` updates for P2 credentials and tenant-scoped valid/invalid probes.
2. `docs/deployment/testable-runtime-deployment.md` updates documenting P2 env variables, local/test credentials, and expected unauthorized failure probes.
3. `.env.example` updates with placeholder-only P2 variables.
4. Validation evidence for Docker runtime plus auth/tenancy smoke.

done_when:

1. Runtime smoke proves authorized health/event path plus missing/invalid credential failures.
2. Runbook lets a fresh developer run P2-authenticated Docker/test runtime without production secrets.
3. `npm run test:db:migrations`, `npm run docker:build`, Docker runtime start, `npm run smoke:runtime`, `npm run test:runtime`, `npm run check:boundaries`, `npm run check:schema-migrations`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if smoke needs real secret management or external producer accounts.
2. Stop if runbook wording claims production auth/tenancy maturity beyond P2-lite.
3. Stop if P3 observability, P4 producers, P5 workers, or P6 Agent runtime are implemented here.

必须避免：

1. Do not store real tokens in docs or `.env.example`.
2. Do not make smoke depend on cloud infrastructure.

#### `DD-P2-CLOSEOUT-S1` — P2 closeout audit

- Owner: `execution-reality-audit`
- State: `QUEUED`
- Priority: `medium`

目标：

- Audit P2 auth/tenancy evidence, preserve residuals, and either terminalize this pack or activate the next concrete P3 observability pack.

交付物：

1. Reality audit over contract doc, schema/storage, runtime auth boundary, tenant-safe writes, smoke/runbook, and validation evidence.
2. Parser-truth writeback to `PACK_COMPLETE` only if all P2 slices are accepted.
3. Master tracker update recommendation for `DD-PR-MASTER-P2` and P3 successor pack.
4. Residual handoff for P3 observability, P4 producer integration, P5 durable workers, P6 Agent runtime, and cloud production deployment hardening.

done_when:

1. README/PLAN/STATUS/WORKSET agree on `PACK_COMPLETE` for the P2 pack or explicitly activate the P3 successor pack.
2. P2 auth/tenancy validation evidence exists, including negative cross-tenant tests and Docker/test smoke if updated.
3. `npm run test:db:migrations`, `npm run test:runtime`, `npm run smoke:runtime` if updated, `npm run check:boundaries`, `npm run check:schema-migrations`, `npm run typecheck`, `npm test`, `npm run check:plan`, `git diff --check`, and `plan_sync docs/plan` pass.
4. No P3/P4/P5/P6 completion is claimed.

stop_boundary:

1. Stop if any accepted P2 slice lacks proof and cannot be audited.
2. Stop if parser truth would mark `PACK_COMPLETE` while any non-deferred P2 stage remains unchecked.
3. Stop if closeout starts implementing P3/P4/P5/P6 instead of preserving residuals.

必须避免：

1. Do not terminalize the pack before auth/tenancy negative evidence is accepted.
2. Do not hide production secret-management or IAM residuals.

## Continuous Wave Ladder

| Order | Slice | Phase loop | Accepted-review next step |
|---|---|---|---|
| 1 | `DD-P2-S1` | `execute -> review` | activate `DD-P2-S2` |
| 2 | `DD-P2-S2` | `execute -> review` | activate `DD-P2-S3` |
| 3 | `DD-P2-S3` | `execute -> review` | activate `DD-P2-S4` |
| 4 | `DD-P2-S4` | `execute -> review` | activate `DD-P2-S5` |
| 5 | `DD-P2-S5` | `execute -> review` | activate `DD-P2-CLOSEOUT-S1` |
| 6 | `DD-P2-CLOSEOUT-S1` | `review -> accepted-writeback` | activate `PACK_COMPLETE` or P3 successor pack |

## Autopilot Transition Contract

- `master_plan/completed` -> `wave_plan` for the active slice if extra wave planning is needed; otherwise `execute`.
- `wave_plan/completed` -> `execute` for the same active slice.
- `execute/completed` -> `review` for the same active slice; execution completion is not terminal.
- `review/completed` + accepted evidence -> update `docs/plan/README.md`, this PLAN if needed, STATUS, and WORKSET; mark the reviewed slice done; activate the next unchecked stage.
- `review/continue` -> keep the same active slice and route to `execute` for in-scope residual work.
- `needs_replan` -> route to `plan-creator`.
- `blocked` / `failed` -> stop and preserve blocker evidence in STATUS.
- `done` is reserved for full objective completion and repo-local closeout prompt surface only.

## Hard Closeout Guard

Closeout is forbidden unless `docs/plan/README.md` and active WORKSET parse as:

```text
Active Stage: PACK_COMPLETE
Owner: closeout
State: DONE
Remaining non-deferred stages: none
```

If closeout is dispatched while any `DD-P2-*` stage is active, treat it as premature and hand back to the active slice owner/handoff.
