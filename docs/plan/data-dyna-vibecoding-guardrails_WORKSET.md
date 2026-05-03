# data-dyna Vibe Coding Guardrails Workset

## Stage Order

- [ ] `DD-VIBE-S1` architecture boundary checker
- [ ] `DD-VIBE-S2` split validation scripts
- [ ] `DD-VIBE-S3` human-critical ownership policy
- [ ] `DD-VIBE-S4` module README contracts
- [ ] `DD-VIBE-S5` schema and migration safety checker
- [ ] `DD-VIBE-S6` service and worker adapter seam contract
- [ ] `DD-VIBE-CLOSEOUT-S1` guardrail audit and handoff

## Active Stage

### `DD-VIBE-S1`

- Owner: `execute-plan`
- State: `READY`
- Priority: `highest`

目标：

- Add an executable boundary check that prevents AI or human edits from introducing forbidden imports across the current module planes.

必须交付：

1. `scripts/check-boundaries.mjs` or equivalent lightweight Node script.
2. `package.json` script `check:boundaries`.
3. Test/probe coverage proving the current tree passes and the checker encodes section 8.1 forbidden dependency rules.
4. Short documentation pointer from the architecture/vibe-coding doc or module policy docs to the command.

done_when:

1. `npm run check:boundaries` exists and passes on the current repository.
2. The checker covers at least these rules: `contracts` imports no project business modules; `ingestion` imports no snapshots/benchmarks/agent/merchant-review/evidence; `projections` imports no snapshots/benchmarks/agent/merchant-review/evidence; `snapshots` imports no agent/merchant-review/evidence; `benchmarks` imports no agent/merchant-review/evidence; `agent` does not import ingestion stores or projection rebuild internals except explicitly allowed type/schema seams; `evidence` does not import agent sidecar runtime.
3. The checker emits actionable file-level violations rather than vague failure text.
4. `git diff --check`, `npm run check:boundaries`, and `npm run typecheck` pass.

stop_boundary:

1. Stop and replan if satisfying a boundary rule requires moving production code across modules instead of adding a checker.
2. Stop if a rule would incorrectly ban an existing intentional deterministic contract seam and cannot be expressed as a narrow allowlist.
3. Stop before adding heavy lint/dependency frameworks unless the lightweight script cannot prove the required boundaries.

必须避免：

1. Do not rewrite module imports only to satisfy a poorly scoped checker.
2. Do not add broad allowlists that make the checker decorative.
3. Do not combine this slice with test-script splitting or CODEOWNERS work.

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
| 7 | `DD-VIBE-CLOSEOUT-S1` | `review -> accepted-writeback` | activate `VIBE_PACK_COMPLETE` only if guardrails are audited |
| terminal | `VIBE_PACK_COMPLETE` | `closeout` | repo-local closeout prompt surface |

`currentWave/maxWaves` or any scheduler wave count is not objective-completion proof; only parser truth `VIBE_PACK_COMPLETE` can permit closeout.

## Hard Closeout Guard

Closeout is forbidden unless this WORKSET and `docs/plan/README.md` parse as:

```text
Active Stage: VIBE_PACK_COMPLETE
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

- active_step: `DD-VIBE-S1`
- latest_completed_step: `none`
- intended_handoff: `execute-plan`
- terminal: `false`
