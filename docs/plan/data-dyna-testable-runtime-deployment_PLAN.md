# data-dyna Testable Runtime Deployment Plan

## Goal

Build the P1 deployment foundation from `docs/roadmap/data-dyna-production-readiness-roadmap.md` as a Dockerfile-based, testable runtime path.

The target is not full production hardening. The target is the fastest trustworthy step from local runtime tests to an externally testable service:

```text
Dockerfile build
  + standard runtime env contract
  + PostgreSQL-backed server startup
  + /healthz and /events smoke proof
  + simple deployment runbook
```

## Current Baseline

Completed prerequisite packs:

- `data-dyna-production-runtime-foundation`: `PACK_COMPLETE`, Fastify app skeleton, PostgreSQL raw-event repository, `/events` and `/events/batch`, runtime tests.
- `data-dyna-db-migration-execution-gate`: `PACK_COMPLETE`, local/CI PostgreSQL migration gate.
- `data-dyna-vibecoding-guardrails`: `PACK_COMPLETE`, boundary/schema/plan checks.

Current validated capabilities:

- `npm run test:db:migrations` proves the PostgreSQL schema can be built.
- `npm run test:runtime` proves Fastify `/events` routes with PostgreSQL repository in local test mode.
- `npm test`, `npm run typecheck`, `npm run check:boundaries`, `npm run check:schema-migrations`, and `npm run check:plan` pass before this plan starts.

## Simplification Policy

The user explicitly authorizes simple forward progress over compatibility preservation for this workstream.

Apply these rules during execution:

1. Prefer one direct runtime path over compatibility shims.
2. Prefer `DATA_DYNA_DATABASE_URL` as the runtime DB seam; do not preserve redundant aliases if a slice replaces them with a simpler tested contract.
3. Keep deterministic Core contracts and accepted migration semantics stable unless the active slice explicitly updates tests and docs for the simpler design.
4. Remove unused or duplicated code caused by this workstream in the same slice.
5. Do not add abstractions, plugin systems, dependency injection frameworks, queue frameworks, auth frameworks, or observability SDKs in P1 unless a later accepted plan opens that scope.
6. Keep code boring: Dockerfile, config, `pg` pool, Fastify server, smoke script, runbook.

## Scope

In scope:

- Dockerfile for the data-dyna runtime.
- `.dockerignore` if needed to keep image context small and deterministic.
- Runtime env contract for HTTP host/port and PostgreSQL connection.
- PostgreSQL-backed `src/app/server.ts` startup path for `/events` in a testable container/runtime environment.
- Minimal runtime smoke command that proves `/healthz`, `/events`, duplicate idempotency, invalid event behavior, and `/events/batch` against the runtime server.
- Deployment/runbook documentation for local Docker-based testing.
- Optional CI/preflight gate only if it remains small and directly proves Docker/runtime readiness.

Out of scope:

- Kubernetes, Helm, Terraform, cloud production deployment, blue/green, canary, autoscaling.
- Production auth/tenancy; P2 owns this.
- Mature observability, tracing, dashboarding, alerting; P3 owns this.
- External producer instrumentation; P4 owns this.
- Durable queue/retry/dead-letter/checkpoint workers; P5 owns this.
- Agent runtime/Pi provider integration; P6 owns this.

## Stage Definitions

#### `DD-P1-S1` — Docker runtime substrate

- Owner: `execute-plan`
- State: `READY`
- Priority: `high`

目标：

- Add the minimal Dockerfile-based runtime substrate and runtime env contract needed to build and start the Fastify app without adding production platform complexity.

交付物：

1. `Dockerfile` for the app runtime using the repo's Node 24 requirement and `npm ci` lockfile install.
2. `.dockerignore` that excludes heavy/local-only files while preserving source, migrations, package files, and runtime docs needed for the image.
3. Package scripts or documented commands for Docker build and runtime start if they reduce ambiguity.
4. `.env.example` or deployment doc updates showing the canonical runtime variables, especially `DATA_DYNA_DATABASE_URL`, `DATA_DYNA_HTTP_HOST`, and `DATA_DYNA_HTTP_PORT`.
5. Validation evidence that local non-Docker tests and parser checks still pass.

done_when:

1. `Dockerfile` exists and uses the simplest Node 24 runtime path that can start `src/app/server.ts`.
2. Docker build context is cleanly bounded by `.dockerignore` or an explicit decision not to add one.
3. Runtime env contract names the canonical variables and does not introduce compatibility aliases unless they are required by an existing test.
4. `npm ci`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop and replan if Docker build requires credentials, private registry access, or host-specific local paths.
2. Stop and replan if implementing this slice requires production auth, tenancy, observability, cloud infrastructure, or external producer ownership.
3. Stop and replan if the simplest Dockerfile requires changing deterministic Core contracts or migration semantics.

必须避免：

1. Do not add Kubernetes, Compose orchestration for multiple environments, or deployment platform abstractions in this slice.
2. Do not add compatibility shims for old runtime config names unless a failing accepted test proves the need.
3. Do not claim the service is production-deployed; this slice only creates a Docker-based testable substrate.

#### `DD-P1-S2` — PostgreSQL-backed server startup

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `high`

目标：

- Make the runtime server start with a PostgreSQL-backed `RawEventStore` through one simple database URL seam so `/events` is testable outside the in-process test harness.

交付物：

1. Simplified runtime DB config centered on `DATA_DYNA_DATABASE_URL`.
2. `src/app/server.ts` or adjacent app runtime code that creates a `pg` pool/client, registers `PostgresRawEventRepository`, and closes resources on shutdown.
3. Tests or probes proving server startup does not regress `/healthz` or route registration.
4. Removal of redundant runtime config/helper code created by this workstream if the new seam supersedes it.

done_when:

1. Starting the server with `DATA_DYNA_DATABASE_URL` registers `/events` and `/events/batch` against PostgreSQL.
2. Missing DB config fails fast with a clear local-runtime error when event routes require persistence.
3. Existing runtime/repository tests pass or are simplified to the new canonical DB seam.
4. `npm run test:db:migrations`, `npm run test:app:repository`, `npm run test:runtime`, `npm run typecheck`, and `npm test` pass.

stop_boundary:

1. Stop and replan if this requires production secret management, auth, tenancy, connection pooling policy beyond a simple `pg` pool, or cloud deployment ownership.
2. Stop and replan if database startup changes require schema migration changes outside raw-event runtime needs.
3. Stop and replan if simplification would hide an accepted residual such as production DB lifecycle or auth/tenancy.

必须避免：

1. Do not keep parallel DB config paths when one tested `DATA_DYNA_DATABASE_URL` seam is sufficient.
2. Do not move `pg` imports into deterministic Core modules.
3. Do not implement production deployment, auth, observability, workers, or Agent runtime from this slice.

#### `DD-P1-S3` — Runtime smoke gate

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `high`

目标：

- Add a small smoke gate that validates the Docker/test runtime path using real HTTP calls against the running service and PostgreSQL database.

交付物：

1. Smoke test script or npm command such as `npm run smoke:runtime`.
2. Smoke fixture that sends `GET /healthz`, valid `POST /events`, duplicate `POST /events`, invalid `POST /events`, and `POST /events/batch`.
3. Clear preconditions for running migrations and setting `DATA_DYNA_DATABASE_URL`.
4. Proof that the smoke gate is distinct from but compatible with `npm run test:runtime`.

done_when:

1. The smoke gate can run against a started runtime server and migrated PostgreSQL database.
2. Smoke checks assert expected HTTP status and core response shape for health, accepted event, duplicate event, invalid event, and batch event.
3. `npm run smoke:runtime`, `npm run test:runtime`, `npm run test:db:migrations`, `npm run typecheck`, and `npm test` pass.
4. The smoke script remains small and does not become a second app framework or fixture system.

stop_boundary:

1. Stop and replan if smoke testing needs external services beyond local PostgreSQL and the runtime container/server.
2. Stop and replan if smoke testing requires auth/tenancy before P2.
3. Stop and replan if test setup becomes broader than a simple start/migrate/smoke loop.

必须避免：

1. Do not replace deterministic unit/integration tests with smoke tests.
2. Do not create large fixture factories or compatibility layers for legacy payload shapes.
3. Do not claim external producer readiness; P4 owns real producer integration.

#### `DD-P1-S4` — Docker runbook and deployment preflight

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `medium`

目标：

- Document and optionally gate the minimal Docker-based test deployment path so another developer can run the service and verify it without hidden chat context.

交付物：

1. `docs/deployment/testable-runtime-deployment.md` with build, migrate, start, smoke, stop, and troubleshooting steps.
2. Explicit residuals for production auth/tenancy, observability, durable workers, external producers, Agent runtime, and cloud deployment.
3. Optional lightweight CI/preflight script only if it directly proves Docker build/runtime smoke without adding platform complexity.
4. Updated roadmap pointer if the active P1 implementation changes the recommended next P2/P3/P4 order.

done_when:

1. Runbook lets a fresh developer start PostgreSQL, apply migrations, build/start the runtime, and run smoke validation.
2. All required commands are copy-pasteable and use only repo-owned files plus Docker/PostgreSQL.
3. Residuals remain explicit and no full production deployment is claimed.
4. `npm run check:plan`, `git diff --check`, and all active runtime validation commands pass.

stop_boundary:

1. Stop and replan if documentation reveals missing executable evidence from earlier P1 slices.
2. Stop and replan if CI/preflight requires secrets, private infrastructure, or external accounts.
3. Stop and replan if the runbook starts claiming P2/P3/P4/P5/P6 completion.

必须避免：

1. Do not create a second plan/control-plane root.
2. Do not add verbose ops documentation that is not executable.
3. Do not hide unresolved production deployment, auth, observability, queue, producer, or Agent gaps.

#### `DD-P1-CLOSEOUT-S1` — P1 closeout audit

- Owner: `execution-reality-audit`
- State: `QUEUED`
- Priority: `medium`

目标：

- Audit the P1 Docker/testable-runtime deployment foundation, preserve residuals, and either terminalize this pack or activate the next accepted P2-lite workstream.

交付物：

1. Reality audit over Dockerfile, runtime DB wiring, smoke gate, runbook, and validation evidence.
2. Parser-truth writeback to `PACK_COMPLETE` only if all P1 slices are accepted.
3. Residual handoff for P2 auth/tenancy, P3 observability, P4 producer integration, P5 durable workers, and P6 Agent runtime.
4. Recommendation for the next active pack after P1, with P2-lite as the default unless review evidence says P3/P4 must precede it.

done_when:

1. README/PLAN/STATUS/WORKSET agree on `PACK_COMPLETE` or an explicitly activated successor pack.
2. Docker build/start/smoke evidence exists or an accepted residual explains why it is unavailable.
3. `npm run test:db:migrations`, `npm run test:runtime`, `npm run smoke:runtime` if added, `npm run check:boundaries`, `npm run check:schema-migrations`, `npm run typecheck`, `npm test`, `npm run check:plan`, `git diff --check`, and `plan_sync docs/plan` pass.
4. No production auth/tenancy, mature observability, external producer integration, durable worker reliability, or Agent runtime is claimed complete.

stop_boundary:

1. Stop if any accepted P1 slice lacks proof and cannot be audited.
2. Stop if parser truth would mark `PACK_COMPLETE` while any non-deferred P1 stage remains unchecked.
3. Stop if closeout starts implementing P2/P3/P4/P5/P6 instead of preserving residuals.

必须避免：

1. Do not terminalize the pack before smoke/runtime/deployment evidence is accepted.
2. Do not create a second control-plane root.
3. Do not hide production hardening residuals behind the phrase “deployment complete.”

## Continuous Wave Ladder

| Order | Slice | Phase loop | Accepted-review next step |
|---|---|---|---|
| 1 | `DD-P1-S1` | `execute -> review` | activate `DD-P1-S2` |
| 2 | `DD-P1-S2` | `execute -> review` | activate `DD-P1-S3` |
| 3 | `DD-P1-S3` | `execute -> review` | activate `DD-P1-S4` |
| 4 | `DD-P1-S4` | `execute -> review` | activate `DD-P1-CLOSEOUT-S1` |
| 5 | `DD-P1-CLOSEOUT-S1` | `review -> accepted-writeback` | activate `PACK_COMPLETE` or successor pack |

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

If closeout is dispatched while any `DD-P1-*` stage is active, treat it as premature and hand back to the active slice owner/handoff.
