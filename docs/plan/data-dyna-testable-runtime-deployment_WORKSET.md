# data-dyna Testable Runtime Deployment Workset

## Stage Order

- [ ] `DD-P1-S1` Docker runtime substrate
- [ ] `DD-P1-S2` PostgreSQL-backed server startup
- [ ] `DD-P1-S3` runtime smoke gate
- [ ] `DD-P1-S4` Docker runbook and deployment preflight
- [ ] `DD-P1-CLOSEOUT-S1` P1 closeout audit

## Active Stage

### `DD-P1-S1`

- Owner: `execute-plan`
- State: `READY`
- Priority: `high`

目标：

- Add the minimal Dockerfile-based runtime substrate and runtime env contract needed to build and start the Fastify app without adding production platform complexity.

必须交付：

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

## Slice Ownership

### `DD-P1-S1`

- Allowed repo surfaces:
  - `Dockerfile`.
  - `.dockerignore`.
  - `package.json` scripts only if they simplify Docker build/start commands.
  - `.env.example` runtime env contract updates.
  - Minimal deployment doc pointer if needed.
- Disallowed surfaces:
  - Production auth/tenancy.
  - Observability SDKs or dashboards.
  - Cloud deployment platform files.
  - External producer instrumentation.
  - Worker queue/runtime implementation.
  - Agent runtime/provider integration.

### `DD-P1-S2`

- Allowed repo surfaces:
  - `src/app/server.ts`.
  - `src/app/app.ts` only for app construction seam updates.
  - `src/app/config/**` simplification around `DATA_DYNA_DATABASE_URL`.
  - `src/app/repositories/postgres-raw-event-repository.ts` only if a minimal pool/client seam needs cleanup.
  - Runtime/repository tests needed to prove the simpler seam.
- Disallowed surfaces:
  - `pg` imports in deterministic Core modules.
  - Production secret management.
  - Auth/tenancy policy.
  - Projection/snapshot/benchmark/evidence repository implementation.

### `DD-P1-S3`

- Allowed repo surfaces:
  - Smoke test script under `scripts/**` or `tests/**`.
  - `package.json` script such as `smoke:runtime`.
  - Small fixture payloads needed to call `/events` and `/events/batch`.
- Disallowed surfaces:
  - Large fixture framework.
  - External producer SDKs.
  - Auth requirements before P2.
  - Replacing deterministic unit/integration tests.

### `DD-P1-S4`

- Allowed repo surfaces:
  - `docs/deployment/testable-runtime-deployment.md`.
  - `docs/roadmap/data-dyna-production-readiness-roadmap.md` if P1 evidence changes next-stage priorities.
  - Optional small CI/preflight script if it directly proves Docker/runtime readiness.
- Disallowed surfaces:
  - Second control-plane root.
  - Cloud infra or secrets.
  - Full production deployment claims.
  - P2/P3/P4/P5/P6 implementation.

### `DD-P1-CLOSEOUT-S1`

- Allowed repo surfaces:
  - docs/plan writeback.
  - Final P1 audit notes.
  - Residual handoff to P2-lite/P3/P4/P5/P6.
- Disallowed surfaces:
  - New implementation outside reviewed P1 evidence.
  - Hidden production readiness claims.
  - Agent runtime or external producer integration.

## Continuous Wave Ladder

| Order | Slice | Phase loop | Accepted-review next step |
|---|---|---|---|
| 1 | `DD-P1-S1` | `execute -> review` | activate `DD-P1-S2` |
| 2 | `DD-P1-S2` | `execute -> review` | activate `DD-P1-S3` |
| 3 | `DD-P1-S3` | `execute -> review` | activate `DD-P1-S4` |
| 4 | `DD-P1-S4` | `execute -> review` | activate `DD-P1-CLOSEOUT-S1` |
| 5 | `DD-P1-CLOSEOUT-S1` | `review -> accepted-writeback` | activate `PACK_COMPLETE` or successor pack |
| terminal | `PACK_COMPLETE` | `autopilot-closeout` | repo-local closeout prompt surface |

`currentWave/maxWaves` or any scheduler wave count is not objective-completion proof; only parser truth and accepted review evidence can permit terminal closeout.

## Simplification and Cleanup Law

- No compatibility-first design: prefer a single direct runtime path over legacy aliases, redundant helpers, or adapter indirection.
- Clean as you go: remove unused code or duplicated workstream-local code in the same slice that makes it obsolete.
- Keep cleanup bounded: do not refactor unrelated Core modules or business logic unless the active slice requires it for the P1 runtime path and tests prove the change.
- The simplest allowed architecture for P1 is `Dockerfile + env contract + Fastify server + pg pool + smoke script + runbook`.

## Expected Verification

General validation escalation as commands become available:

```bash
npm ci
npm run check:plan
git diff --check
npm run check:boundaries
npm run check:schema-migrations
npm run test:db:migrations
npm run test:app:repository
npm run test:runtime
npm run test:app:workers
npm run typecheck
npm test
```

Docker/runtime validation appears as P1 surfaces are added:

```bash
docker build ...
docker run ...
npm run smoke:runtime
```

For plan/parser checks:

```bash
plan_sync /home/peng/dt-git/github/data-dyna/docs/plan
find docs/plan -maxdepth 1 -type f -name '*.md' -print | sort
```

## Execution Notes

- This pack is active because `data-dyna-production-runtime-foundation` reached `PACK_COMPLETE` and the next priority is to make the runtime externally testable.
- `DD-P1-S1` is intentionally Dockerfile-first because the user requested Dockerfile and wants the fastest path to practical testing.
- `execute/completed` routes to `execution-reality-audit`, not terminal completion.
- Accepted review is the only normal point where `README` / `STATUS` / `WORKSET` should advance to the next stage.
- If a slice requires auth/tenancy, observability, external producer integration, durable worker queue, or Agent runtime ownership, route `needs_replan` rather than expanding P1.

## Residual Queue

Known out-of-scope residuals for this P1 pack:

- P2: minimal auth/tenancy and tenant-safe event writes.
- P3: structured logs, metrics, traces, alerts, dashboards, incident/runbook maturity.
- P4: POS, miniapp, mobile-hq, or backend producer instrumentation.
- P5: durable worker queue, retries, checkpoints, dead letters, and idempotent background processing.
- P6: full Agent runtime, real Pi provider integration, and production Agent governance.
- Cloud production deployment hardening beyond Docker-based testable runtime proof.

## Machine Queue

- active_step: `DD-P1-S1`
- latest_completed_step: `none`
- intended_handoff: `execute-plan`
- latest_plan_summary: Created P1 testable runtime deployment pack with Dockerfile-first execution and simplification policy.
- latest_verification:
  - `workspace_scan before planning: data-dyna main, one dirty roadmap doc from prior roadmap creation.`
  - `plan_sync before planning: completed prerequisite packs remain 0 pending; production runtime foundation is 7 done / 0 pending.`
  - `plan-creator skill and autopilot control-plane references were read before writeback.`
  - `New active pack targets P1-lite/Testable Runtime Deployment and starts with DD-P1-S1.`
