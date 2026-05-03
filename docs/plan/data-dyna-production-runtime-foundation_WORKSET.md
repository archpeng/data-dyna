# data-dyna Production Runtime Foundation Workset

## Stage Order

- [x] `DD-RUNTIME-S1` framework/runtime decision
- [x] `DD-RUNTIME-S2` app config and server skeleton
- [x] `DD-RUNTIME-S3` PostgreSQL raw event repository
- [x] `DD-RUNTIME-S4` `/events` HTTP adapter
- [x] `DD-RUNTIME-S5` minimal worker foundation
- [x] `DD-RUNTIME-S6` runtime integration test gate
- [x] `DD-RUNTIME-CLOSEOUT-S1` production runtime foundation audit

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
## Accepted Review Evidence for `DD-RUNTIME-CLOSEOUT-S1`

- Audited `DD-RUNTIME-S1` through `DD-RUNTIME-S6` evidence across the runtime decision doc, Fastify app skeleton, PostgreSQL repository, `/events` adapter, contract-only worker foundation, runtime integration tests, and validation docs.
- Updated `docs/current-architecture-and-vibecoding-review.md` from future-only runtime recommendations to current minimal runtime foundation status while keeping production hardening residuals explicit.
- Preserved residuals for production deployment, auth/tenancy, observability, durable worker reliability, Agent runtime, external producer instrumentation, production DB lifecycle, and queue hardening.
- Terminal writeback marked all runtime stages done and this pack `PACK_COMPLETE` only after validation and parser checks passed.

## Slice Ownership

### `DD-RUNTIME-S1`

- Allowed repo surfaces:
  - `docs/runtime-foundation-decision.md` or equivalent short decision doc.
  - `src/app/README.md` decision pointer if needed.
  - `package.json` only if recording scripts/dependency plan requires it; do not add dependencies before the decision is recorded.
- Disallowed surfaces:
  - Framework-specific route/server implementation before the decision is accepted.
  - Full Agent runtime or provider integration.
  - Production deployment/auth/observability decisions beyond residual notes.

### `DD-RUNTIME-S2`

- Allowed repo surfaces:
  - `src/app/config/**`.
  - `src/app/server.ts`, `src/app/app.ts`, or chosen-framework equivalent.
  - `package.json` local runtime script if needed.
  - Minimal app construction tests/probes.
- Disallowed surfaces:
  - DB clients inside deterministic Core modules.
  - Production secrets or cloud deployment config.
  - Broad framework module system beyond the selected minimal runtime.

### `DD-RUNTIME-S3`

- Allowed repo surfaces:
  - `src/app/repositories/postgres-raw-event-repository.ts`.
  - Repository-specific integration tests.
  - Test/local DB connection seam under `src/app`.
- Disallowed surfaces:
  - Postgres clients in `src/ingestion` or other Core modules.
  - Projection/snapshot/benchmark/evidence repositories.
  - Idempotency weakening or event contract changes.

### `DD-RUNTIME-S4`

- Allowed repo surfaces:
  - `src/app/http/events-route.ts` or chosen-framework equivalent.
  - Route registration in app/server boundary.
  - API integration tests for `/events` and `/events/batch`.
- Disallowed surfaces:
  - Auth/tenant policy implementation beyond local placeholder boundaries.
  - Agent, merchant-review, or evidence side effects from `/events`.
  - Bypassing Zod event contracts or ingestion handlers.

### `DD-RUNTIME-S5`

- Allowed repo surfaces:
  - `src/app/workers/**` minimal worker foundation files.
  - Worker docs/contracts for projection/snapshot/benchmark/evidence scheduling boundaries.
  - Boundary probes if needed.
- Disallowed surfaces:
  - Full queue system unless already selected and accepted in `DD-RUNTIME-S1`.
  - Agent runtime execution.
  - Fake production-ready retry/dead-letter/checkpoint claims.

### `DD-RUNTIME-S6`

- Allowed repo surfaces:
  - Runtime integration test files.
  - `package.json` script `test:runtime` or equivalent.
  - Test setup fixtures for local PostgreSQL and migrated schema.
  - Validation docs pointers.
- Disallowed surfaces:
  - External services beyond local PostgreSQL.
  - Replacing unit tests with runtime tests.
  - CI rewrites not already accepted by DB gate or runtime plan.

### `DD-RUNTIME-CLOSEOUT-S1`

- Allowed repo surfaces:
  - docs/plan writeback.
  - `docs/current-architecture-and-vibecoding-review.md` runtime status/residual update.
  - Final audit and residual notes.
- Disallowed surfaces:
  - Hidden implementation outside reviewed runtime evidence.
  - Full Agent runtime or external producer integration.
  - Second plan root creation.

## Continuous Wave Ladder

| Order | Slice | Phase loop | Accepted-review next step |
|---|---|---|---|
| 1 | `DD-RUNTIME-S1` | `execute -> review` | activate `DD-RUNTIME-S2` |
| 2 | `DD-RUNTIME-S2` | `execute -> review` | activate `DD-RUNTIME-S3` |
| 3 | `DD-RUNTIME-S3` | `execute -> review` | activate `DD-RUNTIME-S4` |
| 4 | `DD-RUNTIME-S4` | `execute -> review` | activate `DD-RUNTIME-S5` |
| 5 | `DD-RUNTIME-S5` | `execute -> review` | activate `DD-RUNTIME-S6` |
| 6 | `DD-RUNTIME-S6` | `execute -> review` | activate `DD-RUNTIME-CLOSEOUT-S1` |
| 7 | `DD-RUNTIME-CLOSEOUT-S1` | `review -> accepted-writeback` | activate `PACK_COMPLETE` only if runtime foundation is audited |
| terminal | `PACK_COMPLETE` | `closeout` | repo-local closeout prompt surface |

`currentWave/maxWaves` or any scheduler wave count is not objective-completion proof; only parser truth and accepted review evidence can permit terminal closeout.

## Parser Drift Repair and Root Cause

The DB gate closeout briefly caused this successor pack to be marked `PACK_COMPLETE` while its Stage Order still had seven unchecked runtime stages. The root issue was a parser-state writeback hazard: terminal closeout metadata from the completed prerequisite pack was applied after `docs/plan/README.md` had already activated this successor pack. That made the scheduler see `PACK_COMPLETE` for the runtime pack and stop instead of dispatching `DD-RUNTIME-S1`.

Repair invariant:

- Accepted `DD-RUNTIME-CLOSEOUT-S1` review advanced active runtime truth to `PACK_COMPLETE` / `closeout` / `DONE`; do not regress it to runtime slices unless a future replan explicitly reopens this pack.
- `PACK_COMPLETE` is illegal for this pack while any Stage Order item remains unchecked.
- `npm run check:plan` must pass after every future README/STATUS/WORKSET writeback.
- Ordinary accepted runtime slices report `completed`; only full objective closeout reports `done`.

## Hard Closeout Guard

Closeout is forbidden unless this WORKSET and `docs/plan/README.md` parse as:

```text
Active Stage: PACK_COMPLETE
Owner: closeout
State: DONE
Remaining non-deferred stages: none
```

If `PACK_COMPLETE` is present while any runtime stage remains unchecked, route `replan` and repair parser truth before continuing.

## Expected Verification

General validation escalation as commands become available:

```bash
npm run check:plan
npm run check:boundaries
npm run check:schema-migrations
npm run test:db:migrations
npm run test:runtime
npm run test:app:repository
npm test
npm run typecheck
git diff --check
```

For plan/parser checks:

```bash
plan_sync /home/peng/dt-git/github/data-dyna/docs/plan
find docs/plan -maxdepth 1 -type f -name '*.md' -print | sort
```

## Execution Notes

- This pack is active because `data-dyna-db-migration-execution-gate` reached `PACK_COMPLETE` with accepted local/CI PostgreSQL migration evidence and commit `5de1b64` was pushed.
- The active stage ID is the `stepId` for active-slice `autopilot_report` calls after activation.
- `execute/completed` routes to `execution-reality-audit`, not terminal completion.
- Accepted review is the only normal point where `README` / `STATUS` / `WORKSET` should advance to the next stage.
- If a runtime slice requires Agent runtime, external producer integration, or production deployment ownership, route `needs_replan` rather than expanding scope.
- Do not weaken existing vibe-coding guardrails to make runtime implementation easier.

## Residual Queue

Known out-of-scope residuals for this pack:

- Full Pi SDK/provider Agent runtime integration.
- External producer repo instrumentation.
- Production auth/tenancy policy.
- Production deployment, secrets management, and cloud infrastructure.
- Mature observability stack, incident response, and rollback/runbook hardening.
- Full queue retry/dead-letter/checkpoint semantics unless a specific slice implements and tests them.

## Machine Queue

- active_step: `PACK_COMPLETE`
- latest_completed_step: `PACK_COMPLETE`
- intended_handoff: `autopilot-closeout`
- latest_closeout_summary: Closed data-dyna-production-runtime-foundation at PACK_COMPLETE.
- latest_verification:
  - `plan_sync docs/plan reports data-dyna-production-runtime-foundation STATUS and WORKSET as 7 done / 0 pending; completed prerequisite packs remain 0 pending.`
  - `Closeout recheck passed: npm run check:plan and git diff --check.`
  - `Review validation already gathered: npm run db:test:up; npm run test:db:migrations; npm run test:app:repository; npm run test:runtime; npm run test:app:workers; npm run check:boundaries; npm run check:schema-migrations; npm run typecheck; npm test; closeout proof probe.`
  - `workspace_scan: data-dyna on main, remote https://github.com/archpeng/data-dyna.git, 18 dirty files pending persistence.`
  - `docs/plan/README.md`
  - `docs/plan/data-dyna-production-runtime-foundation_STATUS.md`
  - `docs/plan/data-dyna-production-runtime-foundation_WORKSET.md`
  - `docs/current-architecture-and-vibecoding-review.md`
  - `docs/runtime-foundation-decision.md`
  - `src/app/**`
  - `tests/app-runtime-s2.spec.ts`
  - `tests/postgres-raw-event-repository.spec.ts`
  - `tests/app-runtime-s4.spec.ts`
  - `tests/app-workers-s5.spec.ts`
- terminal: `true`