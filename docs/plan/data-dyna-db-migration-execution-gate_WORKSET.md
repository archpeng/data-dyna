# data-dyna DB Migration Execution Gate Workset

## Stage Order

- [x] `DD-DB-GATE-S1` local Docker PostgreSQL substrate
- [x] `DD-DB-GATE-S2` migration runner
- [x] `DD-DB-GATE-S3` migration constraint integration tests
- [x] `DD-DB-GATE-S4` CI DB gate
- [x] `DD-DB-GATE-CLOSEOUT-S1` DB gate audit and successor activation

## Active Stage

### `PACK_COMPLETE`

- Owner: `closeout`
- State: `DONE`
- Priority: `terminal`

目标：

- Represent DB migration execution gate completion after accepted closeout evidence.

已交付：

1. Local Docker PostgreSQL substrate for local/CI migration tests.
2. Deterministic migration runner for current `migrations/*.sql` files.
3. PostgreSQL migration integration gate with table and constraint proof.
4. GitHub Actions CI DB gate using the same local/CI conventions.
5. Terminal writeback and production runtime foundation activation.

done_when:

1. All DB gate stages have accepted review evidence or explicit residuals.
2. Parser truth is terminal for this pack and successor activation is explicit.
3. Repo-local closeout preserved validation evidence and residual handoff.

stop_boundary:

1. Stop if any DB gate stage lacks accepted review evidence.
2. Stop if terminal state would hide production database residuals.
3. Stop if README still points to this pack as active but the active slice is not `PACK_COMPLETE`.

必须避免：

1. Do not use wave count as completion proof.
2. Do not mark complete before the closeout audit accepts DB execution evidence.

## Current Wave Execution Plan

### `PACK_COMPLETE` terminal state

1. This DB gate pack is closed unless a future replan explicitly reopens it.
2. `docs/plan/README.md` now activates `data-dyna-production-runtime-foundation` at `DD-RUNTIME-S1`.
3. The next implementation route is the runtime foundation decision slice, not additional DB gate work.

### Expected changed surfaces at closeout

- `docs/plan/README.md` activated the successor pack.
- `docs/plan/data-dyna-db-migration-execution-gate_PLAN.md` marks `DD-DB-GATE-CLOSEOUT-S1` done.
- `docs/plan/data-dyna-db-migration-execution-gate_STATUS.md` and this WORKSET mark `PACK_COMPLETE`.
- `docs/plan/data-dyna-production-runtime-foundation_PLAN.md`, `STATUS.md`, and `WORKSET.md` were activated at `DD-RUNTIME-S1`.

### Terminal exit criteria

- All DB gate slices have accepted review evidence.
- Parser truth reaches `PACK_COMPLETE` for this pack and activates the runtime foundation pack.
- No production database ownership, API runtime, worker runtime, or Agent runtime implementation is claimed complete.

## Accepted Review Evidence for `DD-DB-GATE-CLOSEOUT-S1`

- Closeout audited accepted S1-S4 evidence across Docker substrate, migration runner, PostgreSQL migration integration gate, and GitHub Actions CI gate.
- Content audit confirmed package scripts, docs, and workflow still use local/CI-only PostgreSQL conventions and no production secrets.
- Closeout validation passed: `npm run db:test:reset`, `npm run check:schema-migrations`, `npm run test:db:migrations`, `npm run check:boundaries`, `npm test`, `npm run typecheck`, and `git diff --check`.
- PostgreSQL integration gate applied 7 migrations, verified 33 expected tables, and proved required constraints: `business_mutation_called = FALSE`, `llm_generated_claims = '[]'`, `final_fact_source = 'pos'`, `source_table = 'report.crm.member_labels'`, aggregate-only peer de-identification, and `min_peer_store_count >= 3`.
- Cleanup passed: `docker compose down -v` removed the local PostgreSQL container and volume after validation.
- Closeout writeback moved `docs/plan/README.md` to `data-dyna-production-runtime-foundation` at `DD-RUNTIME-S1` and preserved DB gate production residuals.

## Accepted Review Evidence for `DD-DB-GATE-S4`

- Added `.github/workflows/db-migration-gate.yml` for GitHub Actions because the repo remote is GitHub and no conflicting CI convention exists.
- The workflow starts `postgres:16-alpine` with test-only `data_dyna_test` / `data_dyna` / `data_dyna_local_password` credentials, exposes it on `localhost:55432`, and sets `DATA_DYNA_TEST_DATABASE_URL` to the reviewed local/CI test target.
- The workflow runs visible validation steps after `npm ci`: `git diff --check`, `npm run check:schema-migrations`, `npm run test:db:migrations`, `npm test`, and `npm run typecheck`.
- Updated `docs/local-postgres.md` to document CI parity and that the workflow does not require production secrets, branch protection changes, or remote repository settings.
- Implementation and review validation passed: workflow content checks, `npm run db:test:reset`, `npm run check:schema-migrations`, `npm run test:db:migrations`, `npm test`, `npm run typecheck`, and `git diff --check`.
- Review accepted that local commands remain runnable outside CI and no stop boundary was hit.

## Accepted Review Evidence for `DD-DB-GATE-S3`

- Added `scripts/check-db-migrations.mjs`, a bounded PostgreSQL migration integration gate that resets the reviewed local test schema, invokes `scripts/run-migrations.mjs`, and runs real table/constraint assertions.
- Added package script `test:db:migrations` and docs for the PostgreSQL migration constraint integration gate.
- Positive migration proof passed: `npm run db:test:reset` and `npm run test:db:migrations` reset local `public`, applied `0001_raw_events.sql` through `0007_evidence_store.sql`, and verified 33 expected migrated tables.
- Constraint proof passed with real PostgreSQL inserts/catalog checks for business mutation disabled, empty LLM claims, POS final fact source, Datamesh RFM source table, aggregate-only peer de-identification, and peer threshold floor.
- Review reran syntax, unsafe target refusal, repeated DB migration checks, static schema check, full tests, typecheck, and `git diff --check`.

## Accepted Review Evidence for `DD-DB-GATE-S2`

- Added `scripts/run-migrations.mjs` bounded runner that discovers current `migrations/*.sql`, sorts them lexicographically, and executes each file against PostgreSQL in a transaction.
- Runner reads `DATA_DYNA_TEST_DATABASE_URL` when set, otherwise uses the reviewed local placeholder defaults: database `data_dyna_test`, user `data_dyna`, host `localhost`, port `55432`, and placeholder password `data_dyna_local_password`.
- Added package script `db:migrate:test` and `pg` dev dependency/package-lock entry for local/CI migration execution.
- Migration runner proof passed: `npm run db:test:reset`, health reached `healthy`, `npm run db:migrate:test` applied `0001_raw_events.sql` through `0007_evidence_store.sql` in lexicographic order, and repeat migration execution succeeded.
- Failure reporting proof passed with temporary invalid migrations; output named the failing migration file and PostgreSQL error, and probe files were removed.

## Accepted Review Evidence for `DD-DB-GATE-S1`

- Added `docker-compose.yml` with local/test PostgreSQL service `postgres`, container `data-dyna-postgres-test`, database `data_dyna_test`, user `data_dyna`, host port `55432`, and placeholder password `data_dyna_local_password`.
- Added `.env.example` with placeholder-only local/CI values and `DATA_DYNA_TEST_DATABASE_URL`.
- Added package lifecycle scripts: `db:test:up`, `db:test:down`, and `db:test:reset`.
- Added `docs/local-postgres.md` documenting local/CI-only scope.
- Updated `.gitignore` so `.env.example` can be tracked while real `.env` files remain ignored.
- Docker probes passed: `docker compose config`, `npm run db:test:up`, health check reached `healthy`, `pg_isready` accepted `data_dyna_test`, and cleanup used `docker compose down -v`.

## Slice Ownership

### `DD-DB-GATE-S1`

- Allowed repo surfaces: Docker Compose/test database config, `.env.example`, helper scripts, and local DB docs.
- Disallowed surfaces: production credentials, cloud DB provisioning, API route, repository, worker, Agent runtime, or SQL workaround edits.

### `DD-DB-GATE-S2`

- Allowed repo surfaces: migration runner script, package runner scripts, migration docs, and test-only DB client dependency.
- Disallowed surfaces: migration framework replacement, production credential handling, or business schema contract changes.

### `DD-DB-GATE-S3`

- Allowed repo surfaces: DB migration integration probe/test, package script, and test fixtures for valid/invalid SQL inserts.
- Disallowed surfaces: destructive non-local DB operations, constraint weakening, or broad test runner migration.

### `DD-DB-GATE-S4`

- Allowed repo surfaces: `.github/workflows/*`, CI docs or command pointers, and minimal package command wiring if needed.
- Disallowed surfaces: branch protection, remote settings, real secret provisioning, or removing existing local guardrail commands.

### `DD-DB-GATE-CLOSEOUT-S1`

- Allowed repo surfaces: docs/plan writeback, residual/status docs, and README activation of queued runtime foundation pack.
- Disallowed surfaces: hidden implementation outside reviewed DB gate evidence, runtime API/worker implementation, or second plan root creation.

## Continuous Wave Ladder

| Order | Slice | Phase loop | Accepted-review next step |
|---|---|---|---|
| 1 | `DD-DB-GATE-S1` | `execute -> review` | activate `DD-DB-GATE-S2` |
| 2 | `DD-DB-GATE-S2` | `execute -> review` | activate `DD-DB-GATE-S3` |
| 3 | `DD-DB-GATE-S3` | `execute -> review` | activate `DD-DB-GATE-S4` |
| 4 | `DD-DB-GATE-S4` | `execute -> review` | activate `DD-DB-GATE-CLOSEOUT-S1` |
| 5 | `DD-DB-GATE-CLOSEOUT-S1` | `review -> accepted-writeback` | `PACK_COMPLETE` and activate `data-dyna-production-runtime-foundation` |
| terminal | `PACK_COMPLETE` | `closeout` | completed pack remains terminal unless a future replan reopens it |

`currentWave/maxWaves` or any scheduler wave count is not objective-completion proof; only parser truth and accepted review evidence permit terminal state.

## Hard Closeout Guard

This DB gate pack is terminal and no longer the active pack in `docs/plan/README.md`. If a future route targets this pack while README points to `data-dyna-production-runtime-foundation`, treat it as stale unless a replan explicitly reopens the DB gate pack.

## Expected Verification

Closeout validation passed with:

```bash
npm run check:schema-migrations
npm run test:db:migrations
npm run check:boundaries
npm test
npm run typecheck
git diff --check
plan_sync /home/peng/dt-git/github/data-dyna/docs/plan
```

## Execution Notes

- This pack is complete; do not start additional DB gate implementation unless a future replan reopens it.
- `data-dyna-production-runtime-foundation` is now active at `DD-RUNTIME-S1`.
- If future Docker/PostgreSQL validation fails because of environment limits, record the exact blocker in the successor pack rather than weakening DB gate proof.
- Do not claim production DB readiness from this local/CI migration execution gate.

## Residual Queue

Known out-of-scope residuals after DB gate completion:

- Production database rollout, backup, restore, and rollback procedures.
- Production DB credentials and secret storage.
- Production API/worker runtime implementation.
- Real Pi SDK/provider runtime integration.
- External producer repo instrumentation.
- Remote GitHub Actions execution must run after push; local closeout validated workflow content and command parity.

## Machine Queue

- active_step: `PACK_COMPLETE`
- latest_completed_step: `DD-DB-GATE-CLOSEOUT-S1`
- intended_handoff: `closeout`
- latest_closeout_summary: Accepted DD-DB-GATE-CLOSEOUT-S1, marked this pack `PACK_COMPLETE`, and activated `data-dyna-production-runtime-foundation` at `DD-RUNTIME-S1`.
- latest_verification:
  - `Closeout audited accepted S1-S4 evidence across Docker substrate, migration runner, DB migration integration gate, and CI workflow.`
  - `Closeout validation passed: npm run db:test:reset, npm run check:schema-migrations, npm run test:db:migrations, npm run check:boundaries, npm test, npm run typecheck, and git diff --check.`
  - `PostgreSQL integration gate applied 7 migrations, verified 33 expected tables, and proved required CHECK/catalog constraints.`
  - `README now activates data-dyna-production-runtime-foundation at DD-RUNTIME-S1 with intended handoff execute-plan.`
