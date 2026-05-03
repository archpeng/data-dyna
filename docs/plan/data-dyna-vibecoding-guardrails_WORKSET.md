# data-dyna Vibe Coding Guardrails Workset

## Stage Order

- [x] `DD-VIBE-S1` architecture boundary checker
- [x] `DD-VIBE-S2` split validation scripts
- [x] `DD-VIBE-S3` human-critical ownership policy
- [x] `DD-VIBE-S4` module README contracts
- [x] `DD-VIBE-S5` schema and migration safety checker
- [x] `DD-VIBE-S6` service and worker adapter seam contract
- [x] `DD-VIBE-CLOSEOUT-S1` guardrail audit and handoff

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

### `DD-VIBE-S1`

- Allowed repo surfaces:
  - `scripts/check-boundaries.mjs`
  - `package.json` script append for `check:boundaries`
  - Minimal docs pointer in `docs/current-architecture-and-vibecoding-review.md` or guardrail docs
  - Tests/probes only if needed to prove checker behavior
- Disallowed surfaces:
  - Broad source rewrites
  - Heavy lint/dependency framework adoption
  - Test script splitting, CODEOWNERS, module README work, migration safety checks

### `DD-VIBE-S2`

- Allowed repo surfaces:
  - `package.json` scripts
  - Validation matrix docs
  - No production source changes unless proving script coverage requires a tiny test command fix
- Disallowed surfaces:
  - Removing `npm test` as full gate
  - Skipping existing specs
  - New test runner framework

### `DD-VIBE-S3`

- Allowed repo surfaces:
  - `CODEOWNERS`, `.github/CODEOWNERS`, or `docs/human-critical-review-policy.md`
  - Pointer docs
- Disallowed surfaces:
  - High-risk business logic changes
  - Remote branch protection / repository settings
  - Invented GitHub usernames or owners without evidence

### `DD-VIBE-S4`

- Allowed repo surfaces:
  - `src/contracts/README.md`
  - `src/ingestion/README.md`
  - `src/datamesh/README.md`
  - `src/projections/README.md`
  - `src/snapshots/README.md`
  - `src/benchmarks/README.md`
  - `src/agent/README.md`
  - `src/merchant-review/README.md`
  - `src/evidence/README.md`
  - Short convention pointer in architecture docs
- Disallowed surfaces:
  - Source code movement
  - Import rewrites
  - Future-only behavior documented as implemented

### `DD-VIBE-S5`

- Allowed repo surfaces:
  - `scripts/check-schema-migration-safety.mjs`
  - `package.json` script append for `check:schema-migrations`
  - Guardrail docs update
- Disallowed surfaces:
  - Live database access
  - Migration framework replacement
  - Business contract changes not supported by current tests/docs

### `DD-VIBE-S6`

- Allowed repo surfaces:
  - `src/app/README.md`
  - Optional empty/type-only `src/app/http`, `src/app/repositories`, `src/app/workers` contract files if needed
  - Architecture docs pointer
- Disallowed surfaces:
  - Real HTTP server implementation
  - PostgreSQL client dependency
  - Queue/worker runtime dependency
  - Moving pure modules into app adapters

### `DD-VIBE-CLOSEOUT-S1`

- Allowed repo surfaces:
  - docs/plan writeback
  - `docs/current-architecture-and-vibecoding-review.md` status update
  - final audit/residual notes
- Disallowed surfaces:
  - Hidden implementation changes outside reviewed evidence
  - Production runtime implementation
  - Second plan root creation

## Continuous Wave Ladder

| Order | Slice | Phase loop | Accepted-review next step |
|---|---|---|---|
| 1 | `DD-VIBE-S1` | `execute -> review` | activate `DD-VIBE-S2` |
| 2 | `DD-VIBE-S2` | `execute -> review` | activate `DD-VIBE-S3` |
| 3 | `DD-VIBE-S3` | `execute -> review` | activate `DD-VIBE-S4` |
| 4 | `DD-VIBE-S4` | `execute -> review` | activate `DD-VIBE-S5` |
| 5 | `DD-VIBE-S5` | `execute -> review` | activate `DD-VIBE-S6` |
| 6 | `DD-VIBE-S6` | `execute -> review` | activate `DD-VIBE-CLOSEOUT-S1` |
| 7 | `DD-VIBE-CLOSEOUT-S1` | `review -> accepted-writeback` | activate `PACK_COMPLETE` only if guardrails are audited |
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
npm run test:contracts
npm run test:core
npm run test:agent
npm run test:review
npm run test:evidence
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
- If validation fails and the fix is within the same dominant owner boundary, route `review/continue` -> `execute` same slice.
- If validation failure changes owner boundary, package strategy, data ownership, production runtime, or external repo scope, route `needs_replan` -> `plan-creator`.
- Do not jump from boundary checks to adapter seam or closeout without accepted review evidence for intervening guardrail slices.

## Residual Queue

Known out-of-scope residuals for this pack:

- CI wiring for the new checks may be handled after local commands exist.
- Production Fastify/NestJS or worker runtime implementation requires a separate production foundation plan.
- Real PostgreSQL migration execution and DB integration tests require credentials/runtime ownership.
- Real Pi SDK/provider runtime integration requires a separate Agent runtime plan.
- External producer repo instrumentation requires a separate cross-repo plan.

## Machine Queue

- active_step: `PACK_COMPLETE`
- latest_completed_step: `DD-VIBE-CLOSEOUT-S1`
- intended_handoff: `autopilot-closeout`
- latest_closeout_summary: Accepted guardrail closeout audit and terminalized PACK_COMPLETE.
- latest_verification:
  - `Guardrail artifact audit passed for package scripts, scripts/check-boundaries.mjs, scripts/check-schema-migration-safety.mjs, docs/human-critical-review-policy.md, module READMEs, and src/app/README.md.`
  - `src/app contains only README.md; runtime dependency audit found no web, DB, queue, or observability dependencies.`
  - `npm run check:boundaries and npm run check:schema-migrations passed.`
  - `npm run test:contracts, npm run test:core, npm run test:agent, npm run test:review, npm run test:evidence, npm test, and npm run typecheck passed.`
  - `git diff --check passed.`
  - `Terminal parser consistency passed with active slice PACK_COMPLETE owner/state closeout/DONE.`
  - `plan_sync /home/peng/dt-git/github/data-dyna/docs/plan reports guardrails STATUS/WORKSET 7 done / 0 pending.`
  - `docs/plan/README.md`
  - `docs/plan/data-dyna-vibecoding-guardrails_STATUS.md`
  - `docs/plan/data-dyna-vibecoding-guardrails_WORKSET.md`
  - `docs/current-architecture-and-vibecoding-review.md`
- terminal: `true`