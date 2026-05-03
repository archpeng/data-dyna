# data-dyna DB Migration Execution Gate Workset

## Stage Order

- [ ] `DD-DB-GATE-S1` local Docker PostgreSQL substrate
- [ ] `DD-DB-GATE-S2` migration runner
- [ ] `DD-DB-GATE-S3` migration constraint integration tests
- [ ] `DD-DB-GATE-S4` CI DB gate
- [ ] `DD-DB-GATE-CLOSEOUT-S1` DB gate audit and successor activation

## Active Stage

### `DD-DB-GATE-S1`

- Owner: `execute-plan`
- State: `READY`
- Priority: `highest`

目标：

- Add a local Docker PostgreSQL test substrate that later migration and runtime packs can use without production credentials.

必须交付：

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

## Slice Ownership

### `DD-DB-GATE-S1`

- Allowed repo surfaces:
  - Docker Compose/test database config.
  - `.env.example` or docs with placeholder local DB variables.
  - `package.json` helper scripts for local DB lifecycle if needed.
  - Minimal docs pointer to local/CI-only DB substrate.
- Disallowed surfaces:
  - Production credentials or cloud DB provisioning.
  - API route, repository, worker, or Agent runtime implementation.
  - SQL migration edits unless a current inconsistency is proven.

### `DD-DB-GATE-S2`

- Allowed repo surfaces:
  - `scripts/run-migrations.mjs` or equivalent.
  - `package.json` migration runner scripts.
  - Minimal docs pointer for migration command usage.
  - Test-only DB client dependency if required by the runner.
- Disallowed surfaces:
  - Migration framework replacement without replan.
  - Production credential handling.
  - Business schema contract changes.

### `DD-DB-GATE-S3`

- Allowed repo surfaces:
  - `tests/db-migrations.integration.spec.ts` or `scripts/check-db-migrations.mjs`.
  - `package.json` script `test:db:migrations` or equivalent.
  - Test fixtures for valid/invalid SQL inserts.
- Disallowed surfaces:
  - Destructive operations against non-local databases.
  - Constraint weakening.
  - Broad unrelated test runner migration.

### `DD-DB-GATE-S4`

- Allowed repo surfaces:
  - `.github/workflows/*` if repo has no conflicting CI convention.
  - CI docs or command pointers.
  - `package.json` command wiring if needed.
- Disallowed surfaces:
  - Branch protection or remote repository settings.
  - Real secret provisioning.
  - Removing existing local guardrail commands.

### `DD-DB-GATE-CLOSEOUT-S1`

- Allowed repo surfaces:
  - docs/plan writeback.
  - `docs/current-architecture-and-vibecoding-review.md` residual/status update if needed.
  - README activation of the queued runtime foundation pack when evidence passes.
- Disallowed surfaces:
  - Hidden implementation outside reviewed DB gate evidence.
  - Runtime API/worker implementation.
  - Second plan root creation.

## Continuous Wave Ladder

| Order | Slice | Phase loop | Accepted-review next step |
|---|---|---|---|
| 1 | `DD-DB-GATE-S1` | `execute -> review` | activate `DD-DB-GATE-S2` |
| 2 | `DD-DB-GATE-S2` | `execute -> review` | activate `DD-DB-GATE-S3` |
| 3 | `DD-DB-GATE-S3` | `execute -> review` | activate `DD-DB-GATE-S4` |
| 4 | `DD-DB-GATE-S4` | `execute -> review` | activate `DD-DB-GATE-CLOSEOUT-S1` |
| 5 | `DD-DB-GATE-CLOSEOUT-S1` | `review -> accepted-writeback` | mark this pack `PACK_COMPLETE`, then activate `data-dyna-production-runtime-foundation` |
| terminal | `PACK_COMPLETE` | `closeout` | repo-local closeout prompt surface or successor pack activation evidence |

`currentWave/maxWaves` or any scheduler wave count is not objective-completion proof; only parser truth and accepted review evidence can permit closeout or successor activation.

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
npm run check:schema-migrations
npm run db:migrate:test
npm run test:db:migrations
npm run check:boundaries
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

- The active stage ID is the `stepId` for active-slice `autopilot_report` calls.
- `execute/completed` routes to `execution-reality-audit`, not terminal completion.
- Accepted review is the only normal point where `STATUS` / `WORKSET` should advance to the next stage.
- If Docker/PostgreSQL validation fails because of environment limits, record the exact blocker and do not fake DB proof.
- If validation failure requires business schema or production DB ownership decisions, route `needs_replan` -> `plan-creator`.
- Do not start `data-dyna-production-runtime-foundation` until this pack's closeout either accepts DB gate evidence or explicitly replans around an environment blocker.

## Residual Queue

Known out-of-scope residuals for this pack:

- Production database rollout, backup, restore, and rollback procedures.
- Production DB credentials and secret storage.
- Production API/worker runtime implementation.
- Real Pi SDK/provider runtime integration.
- External producer repo instrumentation.

## Machine Queue

- active_step: `DD-DB-GATE-S1`
- latest_completed_step: `NONE`
- intended_handoff: `execute-plan`
- latest_planning_summary: Created DB migration execution gate pack and selected local Docker PostgreSQL substrate as the first executable slice.
- latest_verification:
  - `docs/plan/README.md points to exactly three DB gate active pack files.`
  - `DB gate PLAN/STATUS/WORKSET define five proof-carrying stages plus terminal PACK_COMPLETE.`
  - `Production runtime foundation pack is created as queued successor but not active until DB gate closeout accepts evidence.`
