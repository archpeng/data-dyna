# data-dyna DB Migration Execution Gate Plan

## Goal

Turn the existing static schema/migration safety checks into a real local and CI database execution gate that proves the SQL migrations can run on PostgreSQL and that the critical safety constraints reject unsafe data.

## Scope

In scope:

- Add a local Docker PostgreSQL substrate for development and tests.
- Add a deterministic migration runner for the existing `migrations/*.sql` files.
- Add integration tests or probes that execute migrations against PostgreSQL and assert key constraints.
- Add package scripts and CI wiring for the DB migration gate.
- Preserve the existing lightweight `npm run check:schema-migrations` static smoke check.
- Prepare a clean handoff to the queued `data-dyna-production-runtime-foundation` pack.

## Non-Goals

- No production database credentials, cloud database provisioning, backups, or restore policy.
- No production deployment or long-lived staging database ownership.
- No migration framework replacement unless a bounded slice proves the current SQL-runner approach cannot satisfy the gate.
- No business contract changes except to fix a proven inconsistency found by real PostgreSQL execution.
- No API route, worker runtime, or Agent runtime implementation in this pack.

## Deliverables

1. Docker PostgreSQL local test substrate with no committed secrets.
2. Migration runner for current SQL files.
3. PostgreSQL integration test/probe that verifies migrations and key constraints actually execute.
4. CI database gate that runs the migration execution proof.
5. Closeout writeback that keeps residual production DB ownership separate from this local/CI gate.

## Verification

Baseline verification for planning/docs-only edits:

```bash
git diff --check
plan_sync /home/peng/dt-git/github/data-dyna/docs/plan
```

Expected implementation verification as slices add commands:

```bash
npm run check:schema-migrations
npm run db:migrate:test
npm run test:db:migrations
npm run check:boundaries
npm test
npm run typecheck
git diff --check
```

If Docker or PostgreSQL is unavailable in the execution environment, the active slice must record that as an environment residual and preserve a runnable command contract rather than faking success.

## Source Documents

- `docs/current-architecture-and-vibecoding-review.md` sections 8-11.
- `docs/human-critical-review-policy.md` migration review policy.
- `scripts/check-schema-migration-safety.mjs`.
- `migrations/*.sql`.
- `src/*/README.md` module contracts.
- `package.json` scripts.

## Continuous Wave Ladder

```text
DD-DB-GATE-S1 local Docker PostgreSQL substrate
  -> DD-DB-GATE-S2 migration runner
  -> DD-DB-GATE-S3 migration constraint integration tests
  -> DD-DB-GATE-S4 CI DB gate
  -> DD-DB-GATE-CLOSEOUT-S1 DB gate audit and successor activation
  -> PACK_COMPLETE terminal parser state, then activate data-dyna-production-runtime-foundation
```

Accepted review of each stage activates the next stage in this order. Do not start runtime API/repository work before `DD-DB-GATE-CLOSEOUT-S1` accepts the DB execution gate or explicitly records an environment blocker.

## Slice Definitions

#### `DD-DB-GATE-S1` — local Docker PostgreSQL substrate

- Owner: `execute-plan`
- State: `DONE`
- Priority: `highest`

目标：

- Add a local Docker PostgreSQL test substrate that later migration and runtime packs can use without production credentials.

交付物：

1. Docker Compose or equivalent local PostgreSQL service definition for test/development use.
2. `.env.example` or documented test environment variables with placeholder values only.
3. Package scripts or docs for starting/stopping/resetting the local DB, if needed by the chosen substrate.
4. A short docs pointer explaining that this is local/CI-only and not production DB ownership.

done_when:

1. A future executor can start a local PostgreSQL instance for migration tests without using production credentials.
2. The substrate exposes deterministic database name, user, port, and connection string conventions for later scripts.
3. No secrets, production hostnames, or cloud credentials are committed.
4. `git diff --check`, `npm run check:schema-migrations`, and `npm run typecheck` pass.

stop_boundary:

1. Stop if the environment cannot support Docker and no test Postgres alternative is authorized.
2. Stop if production DB credentials, cloud provisioning, or secret management decisions become necessary.
3. Stop before changing SQL migrations to work around local environment setup.

必须避免：

1. Do not commit real credentials.
2. Do not claim production database readiness from a local Docker service.
3. Do not start API or worker runtime implementation in this substrate slice.

#### `DD-DB-GATE-S2` — migration runner

- Owner: `execute-plan`
- State: `DONE`
- Priority: `highest`

目标：

- Add a deterministic runner that executes the existing SQL migrations against PostgreSQL in filename order.

交付物：

1. A bounded migration runner script such as `scripts/run-migrations.mjs`.
2. Package script such as `db:migrate:test` or `db:migrate:local` that uses the local/CI connection string.
3. Runner behavior for ordered execution, failure reporting, and repeatable local test use.
4. Documentation of what the runner does and does not replace.

done_when:

1. The runner executes all current `migrations/*.sql` files against local PostgreSQL in lexicographic order.
2. Failure output identifies the migration file and database error.
3. The runner does not require production credentials and does not replace the SQL migration source of truth.
4. `npm run check:schema-migrations`, the new migration runner command, `npm run typecheck`, and `git diff --check` pass when PostgreSQL is available.

stop_boundary:

1. Stop if migration execution requires adopting a full migration framework rather than a bounded runner.
2. Stop if an existing migration fails and fixing it would change a business contract or data ownership rule.
3. Stop if credentials beyond local/CI test values are needed.

必须避免：

1. Do not silently skip migration files.
2. Do not hide SQL errors behind vague runner output.
3. Do not weaken `scripts/check-schema-migration-safety.mjs` to make the runner pass.

#### `DD-DB-GATE-S3` — migration constraint integration tests

- Owner: `execute-plan`
- State: `DONE`
- Priority: `highest`

目标：

- Prove the critical migration constraints execute in real PostgreSQL, not only as static text checks.

交付物：

1. Integration test or probe such as `tests/db-migrations.integration.spec.ts` or `scripts/check-db-migrations.mjs`.
2. Positive assertions that core tables exist after migration execution.
3. Negative assertions for required constraints, including business mutation disabled, empty LLM claims, POS final fact source, Datamesh RFM source table, aggregate-only peer de-identification, and peer threshold floor.
4. Package script such as `test:db:migrations`.

done_when:

1. `npm run test:db:migrations` runs migrations against PostgreSQL and passes on a clean test database.
2. The test proves at least these constraints with real inserts or catalog checks: `business_mutation_called = FALSE`, `llm_generated_claims = '[]'`, `final_fact_source = 'pos'`, `source_table = 'report.crm.member_labels'`, aggregate-only peer de-identification, and `min_peer_store_count >= 3`.
3. The test isolates or resets its database state so repeated local runs are safe.
4. `npm run check:schema-migrations`, `npm run test:db:migrations`, `npm test`, `npm run typecheck`, and `git diff --check` pass when PostgreSQL is available.

stop_boundary:

1. Stop if a constraint cannot be proven without changing business semantics.
2. Stop if test isolation would require destructive operations against any non-local database.
3. Stop if PostgreSQL version assumptions conflict with the project runtime target and no target has been agreed.

必须避免：

1. Do not treat static grep checks as full DB integration proof.
2. Do not write brittle tests that only check whitespace or comments.
3. Do not drop or relax constraints to make negative tests easier.

#### `DD-DB-GATE-S4` — CI DB gate

- Owner: `execute-plan`
- State: `DONE`
- Priority: `high`

目标：

- Wire the local PostgreSQL migration proof into CI so migration drift fails before merge.

交付物：

1. CI workflow or update to existing CI that starts PostgreSQL and runs the DB migration gate.
2. CI environment variables using test-only credentials.
3. CI command order that keeps static checks, migration execution, tests, and typecheck visible.
4. Documentation of local parity with the CI DB gate.

done_when:

1. CI configuration runs PostgreSQL service/container and invokes the migration execution gate command.
2. CI does not require real production secrets.
3. Local commands remain runnable outside CI.
4. `git diff --check`, `npm run check:schema-migrations`, `npm run test:db:migrations`, `npm test`, and `npm run typecheck` pass locally when PostgreSQL is available, or unavailable CI-only validation is explicitly documented.

stop_boundary:

1. Stop if remote repository settings, branch protection, or secret provisioning are required.
2. Stop if CI provider choice is unclear and no existing `.github` or CI convention exists.
3. Stop before broad unrelated CI/lint refactors.

必须避免：

1. Do not require production secrets in CI.
2. Do not silently skip DB integration tests in CI.
3. Do not remove existing local validation commands.

#### `DD-DB-GATE-CLOSEOUT-S1` — DB gate audit and successor activation

- Owner: `execution-reality-audit`
- State: `DONE`
- Priority: `medium`

目标：

- Audit the DB migration execution gate and activate the production runtime foundation pack only after DB proof is honest.

交付物：

1. Reality audit over Docker substrate, migration runner, DB integration tests, and CI gate.
2. Updated `STATUS` / `WORKSET` evidence and residuals for any environment-specific DB limitations.
3. README activation of `data-dyna-production-runtime-foundation` if DB gate evidence passes.
4. Terminal writeback to `PACK_COMPLETE` for this pack.

done_when:

1. README/PLAN/STATUS/WORKSET either agree on terminal `PACK_COMPLETE` for this pack and activate the runtime pack, or preserve a documented blocker.
2. All DB gate slices have command-backed evidence or explicit environment residuals.
3. `plan_sync docs/plan`, `git diff --check`, static schema check, migration execution gate, existing tests, and typecheck pass or unavailable DB execution is documented as a blocker.
4. No production DB, API runtime, worker runtime, or Agent runtime is claimed complete.

stop_boundary:

1. Stop if any accepted DB gate slice lacks proof and cannot be audited.
2. Stop if production database ownership or deployment starts during closeout.
3. Stop if activating the runtime pack would hide a failed or unavailable DB migration gate.

必须避免：

1. Do not activate runtime implementation when DB execution proof is missing without an explicit replan.
2. Do not create a second plan root.
3. Do not claim production database readiness.

#### `PACK_COMPLETE` — terminal parser state

- Owner: `closeout`
- State: `DONE`
- Priority: `terminal`

目标：

- Represent DB migration execution gate completion only after accepted closeout evidence.

交付物：

1. README has moved to the successor runtime pack or clearly records no successor activation due to blocker.
2. This pack STATUS/WORKSET mark all non-deferred DB gate stages complete.
3. Residual production DB ownership remains explicit.

done_when:

1. All non-deferred DB gate stages have accepted review evidence or explicit residuals.
2. Parser truth is terminal for this pack and successor activation is explicit.
3. Repo-local closeout preserved validation evidence and residual handoff.

stop_boundary:

1. Stop if any DB gate stage lacks accepted review evidence.
2. Stop if terminal state would hide production database residuals.
3. Stop if README still points to this pack as active but the active slice is not `PACK_COMPLETE`.

必须避免：

1. Do not use wave count as completion proof.
2. Do not mark complete before the closeout audit accepts DB execution evidence.

## Exit Criteria

- Local/CI PostgreSQL migration execution is runnable and documented.
- Static and real DB migration checks are both preserved.
- Critical safety constraints are proven against PostgreSQL.
- The queued production runtime foundation pack is activated only after honest DB gate evidence.
