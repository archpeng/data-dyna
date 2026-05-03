# data-dyna Testable Runtime Deployment Workset

## Stage Order

- [x] `DD-P1-S1` Docker runtime substrate
- [x] `DD-P1-S2` PostgreSQL-backed server startup
- [x] `DD-P1-S3` runtime smoke gate
- [x] `DD-P1-S4` Docker runbook and deployment preflight
- [x] `DD-P1-CLOSEOUT-S1` P1 closeout audit

## Active Stage

### `PACK_COMPLETE`

- Owner: `closeout`
- State: `DONE`
- Priority: `terminal`

目标：

- close the pack through the repo-local closeout prompt surface

必须交付：

1. final closeout summary and residual handoff

必须避免：

1. dispatching another execute/review phase from terminal parser truth
## Accepted Review Evidence for `DD-P1-CLOSEOUT-S1`

- Audited `DD-P1-S1` through `DD-P1-S4` across Dockerfile, `.dockerignore`, runtime env contract, PostgreSQL-backed server startup, smoke gate, testable-runtime runbook, and validation evidence.
- Verified the Docker/test runtime path with local PostgreSQL, migrations, image build, container start, `/healthz` wait, `npm run smoke:runtime`, and cleanup.
- Preserved residuals for P2 auth/tenancy, P3 observability, P4 producer integration, P5 durable workers, P6 Agent runtime, cloud deployment, production database lifecycle, and secret management.
- Recommended P2-lite auth/tenancy as the default next pack; P3 observability should follow before real producer traffic expansion.
- Terminal writeback marked all P1 stages done and this pack `PACK_COMPLETE` only after validation and parser checks passed.

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

- active_step: `PACK_COMPLETE`
- latest_completed_step: `PACK_COMPLETE`
- intended_handoff: `autopilot-closeout`
- latest_closeout_summary: Closed and pushed P1 testable runtime deployment.
- latest_verification:
  - `plan_sync docs/plan reports data-dyna-testable-runtime-deployment STATUS/WORKSET as 5 done / 0 pending, with prior completed packs still done.`
  - `npm run check:plan and git diff --check passed immediately before commit.`
  - `Committed 15 P1 files as 6c11098 and pushed main to https://github.com/archpeng/data-dyna.git; workspace_scan reports branch main clean with 0 dirty files.`
  - `GitHub Actions check-run db-migration-gate job 74100817483 for 6c110986a9fc36b0ae845bc126d2c6ada541ae93 completed with conclusion success.`
  - `Closeout validation evidence preserved from review: migrations, repository test, Docker build/run, /healthz wait, smoke:runtime, runtime/workers tests, boundaries, schema migrations, typecheck, npm test, plan check, diff check, and container cleanup all passed.`
  - `commit 6c11098 chore: add testable runtime deployment pushed to main`
  - `docs/plan/README.md`
  - `docs/plan/data-dyna-testable-runtime-deployment_PLAN.md`
  - `docs/plan/data-dyna-testable-runtime-deployment_STATUS.md`
  - `docs/plan/data-dyna-testable-runtime-deployment_WORKSET.md`
  - `Dockerfile`
  - `.dockerignore`
  - `docs/deployment/testable-runtime-deployment.md`
  - `scripts/smoke-runtime.mjs`
  - `src/app/runtime-server.ts`
- terminal: `true`