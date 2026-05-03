# data-dyna Production Runtime Foundation Workset

## Stage Order

- [ ] `DD-RUNTIME-S1` framework/runtime decision
- [ ] `DD-RUNTIME-S2` app config and server skeleton
- [ ] `DD-RUNTIME-S3` PostgreSQL raw event repository
- [ ] `DD-RUNTIME-S4` `/events` HTTP adapter
- [ ] `DD-RUNTIME-S5` minimal worker foundation
- [ ] `DD-RUNTIME-S6` runtime integration test gate
- [ ] `DD-RUNTIME-CLOSEOUT-S1` production runtime foundation audit

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

`currentWave/maxWaves` or any scheduler wave count is not objective-completion proof; only parser truth `PACK_COMPLETE` can permit closeout.

## Hard Closeout Guard

Closeout is forbidden unless this WORKSET and `docs/plan/README.md` parse as:

```text
Active Stage: PACK_COMPLETE
Owner: closeout
State: DONE
Remaining non-deferred stages: none
```

## Expected Verification

General validation escalation as commands become available:

```bash
npm run check:boundaries
npm run check:schema-migrations
npm run test:db:migrations
npm run test:runtime
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

- This pack is active because `data-dyna-db-migration-execution-gate` reached `PACK_COMPLETE` with accepted local/CI PostgreSQL migration evidence.
- The active stage ID is the `stepId` for active-slice `autopilot_report` calls after activation.
- `execute/completed` routes to `execution-reality-audit`, not terminal completion.
- Accepted review is the only normal point where `STATUS` / `WORKSET` should advance to the next stage.
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
- latest_completed_step: `DD-DB-GATE-CLOSEOUT-S1`
- intended_handoff: `autopilot-closeout`
- latest_closeout_summary: Completed DB gate closeout and activated the runtime foundation pack.
- latest_verification:
  - `Closeout content audit confirmed local/CI-only PostgreSQL conventions, required package scripts, GitHub Actions PostgreSQL service, visible CI command order, and no workflow `secrets.*` references.`
  - `Validation passed: `npm run db:test:reset`, `npm run check:schema-migrations`, `npm run test:db:migrations`, `npm run check:boundaries`, `npm test`, `npm run typecheck`, and `git diff --check`.`
  - ``npm run test:db:migrations` applied 7 migrations, verified 33 expected tables, and proved required CHECK/catalog constraints in PostgreSQL.`
  - `Parser consistency check passed: DB gate STATUS/WORKSET are `PACK_COMPLETE` / `closeout` / `DONE`; README and runtime STATUS/WORKSET now activate `DD-RUNTIME-S1` / `execute-plan` / `READY`.`
  - ``plan_sync /home/peng/dt-git/github/data-dyna/docs/plan` reports DB gate STATUS/WORKSET 5 done / 0 pending and runtime foundation STATUS/WORKSET 0 done / 7 pending.`
  - `docs/plan/README.md`
  - `docs/plan/data-dyna-db-migration-execution-gate_PLAN.md`
  - `docs/plan/data-dyna-db-migration-execution-gate_STATUS.md`
  - `docs/plan/data-dyna-db-migration-execution-gate_WORKSET.md`
  - `docs/plan/data-dyna-production-runtime-foundation_PLAN.md`
  - `docs/plan/data-dyna-production-runtime-foundation_STATUS.md`
  - `docs/plan/data-dyna-production-runtime-foundation_WORKSET.md`
  - `.github/workflows/db-migration-gate.yml`
  - `docs/local-postgres.md`
  - `scripts/run-migrations.mjs`
  - `scripts/check-db-migrations.mjs`
- terminal: `true`