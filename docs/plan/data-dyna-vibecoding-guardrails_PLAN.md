# data-dyna Vibe Coding Guardrails Plan

## Goal

Turn the architecture review recommendations in `docs/current-architecture-and-vibecoding-review.md` sections 8 and 9 into executable repository guardrails so AI coders can safely understand, edit, validate, and extend `data-dyna` without silently breaking facts, Agent boundaries, merchant-confirmation semantics, evidence interpretation, or migration contracts.

## Scope

In scope:

- Add a lightweight architecture boundary checker and package script.
- Split test scripts by module plane while preserving the full `npm test` gate.
- Add human-critical review policy / ownership docs for state machines, validator, evidence, and migrations.
- Add short module README files with consistent AI-coder contracts.
- Add a lightweight schema / migration safety check for critical constraints.
- Add minimal production-adapter seam documentation or scaffolding without converting the MVP into a full production service.
- Update docs and plan truth after each accepted slice.

## Non-Goals

- No production deployment, real PostgreSQL credentials, or live migration execution.
- No Fastify/NestJS production API implementation unless a future pack explicitly scopes it.
- No real Pi SDK/provider/runtime integration in this pack.
- No external producer repo edits.
- No new business features, metrics, Agent tools, or merchant lifecycle states unless required for guardrail proof.
- No broad formatting, directory reshuffle, or monorepo migration.

## Deliverables

1. `scripts/check-boundaries.mjs` plus `npm run check:boundaries`.
2. Split test scripts for contracts/core/agent/review/evidence while retaining `npm test`.
3. Human-critical review policy, preferably `CODEOWNERS` plus a docs fallback where ownership semantics need explanation.
4. Module README files for current `src/*` modules with `Owns / Inputs / Outputs / Allowed imports / Forbidden / Validation`.
5. `scripts/check-schema-migration-safety.mjs` or equivalent plus package script.
6. Minimal app/adapter seam contract that preserves pure deterministic modules and keeps DB/I/O outside core computation.
7. Final guardrail audit proving all new checks and current tests pass.

## Verification

Baseline verification for all slices:

```bash
git diff --check
plan_sync /home/peng/dt-git/github/data-dyna/docs/plan
```

Implementation slices should run the narrowest matching checks, escalating to:

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
```

If a command does not exist before its slice, that slice must create it or document why it is intentionally deferred.

## Source Documents

- `docs/current-architecture-and-vibecoding-review.md`
- `docs/stack/data-dyna-core-and-pi-agent-sidecar-architecture.md`
- `docs/plan/README.md`
- Existing implementation files under `src/`, `tests/`, `migrations/`, `.pi/`, and `package.json`.

## Continuous Wave Ladder

```text
DD-VIBE-S1 architecture boundary checker
  -> DD-VIBE-S2 split validation scripts
  -> DD-VIBE-S3 human-critical ownership policy
  -> DD-VIBE-S4 module README contracts
  -> DD-VIBE-S5 schema/migration safety checker
  -> DD-VIBE-S6 app/worker adapter seam contract
  -> DD-VIBE-CLOSEOUT-S1 guardrail audit and handoff
  -> VIBE_PACK_COMPLETE terminal parser state only after accepted closeout
```

Accepted review of each stage activates the next stage in this order. Do not jump over intermediate slices. `currentWave/maxWaves` or any human wave count is not completion evidence.

## Slice Definitions

#### `DD-VIBE-S1` — architecture boundary checker

- Owner: `execute-plan`
- State: `READY`
- Priority: `highest`

目标：

- Add an executable boundary check that prevents AI or human edits from introducing forbidden imports across the current module planes.

交付物：

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

#### `DD-VIBE-S2` — split validation scripts

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `highest`

目标：

- Split the monolithic test command into module-plane scripts so AI coders can run minimal relevant validation without losing the full regression gate.

交付物：

1. `package.json` scripts: `test:contracts`, `test:core`, `test:agent`, `test:review`, `test:evidence`.
2. Existing `npm test` remains the full all-spec gate.
3. Documentation update describing which script to run for which module plane.
4. Proof that each split command and full command pass.

done_when:

1. All requested split test scripts exist and map to the current spec files without dropping coverage.
2. `npm test` still runs all current specs.
3. `npm run test:contracts`, `npm run test:core`, `npm run test:agent`, `npm run test:review`, `npm run test:evidence`, `npm test`, and `npm run typecheck` pass.
4. The architecture/vibe-coding validation matrix no longer says split scripts are future-only.

stop_boundary:

1. Stop if changing scripts requires changing test behavior or production logic.
2. Stop if any spec is orphaned from both a split script and `npm test`.
3. Stop before introducing a new test runner framework.

必须避免：

1. Do not delete or weaken `npm test`.
2. Do not silently skip flaky or slow tests.
3. Do not rename existing specs unless required by an explicit follow-up plan.

#### `DD-VIBE-S3` — human-critical ownership policy

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `high`

目标：

- Mark high-risk state-machine, validator, evidence, Agent tool, and migration surfaces as human-critical review zones.

交付物：

1. `CODEOWNERS` or `.github/CODEOWNERS` if the repo convention supports it; otherwise a clear `docs/human-critical-review-policy.md` fallback.
2. Policy covering `src/merchant-review/**`, `src/evidence/**`, `src/agent/agent-tools.ts`, `src/agent/experiment-validator.ts`, and `migrations/**`.
3. Explanation of why each surface is human-critical and what reviewers must check.
4. Pointer from the architecture/vibe-coding doc to the policy.

done_when:

1. A future AI coder can identify human-critical paths and required review concerns from repo files without chat context.
2. Policy explicitly protects lifecycle transitions, validator safety, evidence non-causal interpretation, no mutation tools, migration safety constraints, and no external repo edits.
3. `git diff --check` passes.
4. Existing `npm run check:boundaries`, split test scripts, and `npm run typecheck` still pass unless this docs-only slice intentionally records why code checks are unnecessary.

stop_boundary:

1. Stop and ask/replan if CODEOWNERS owner handles require organization-specific usernames not present in repo context.
2. Stop before changing GitHub branch protection or remote repository settings.
3. Stop if policy starts authorizing business mutation instead of review requirements.

必须避免：

1. Do not invent real human owners or GitHub handles without evidence.
2. Do not turn review policy into long narrative docs that AI coders will not read.
3. Do not modify high-risk business code in this policy slice.

#### `DD-VIBE-S4` — module README contracts

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `high`

目标：

- Add short, uniform module READMEs so AI coders can quickly understand what each module owns, consumes, emits, may import, must not do, and how to validate changes.

交付物：

1. `README.md` files under current module directories, or one documented exception if a directory is not a module.
2. Each README uses the fixed headings: `Owns`, `Inputs`, `Outputs`, `Allowed imports`, `Forbidden`, `Validation`.
3. Content reflects current code, not future production intent.
4. A root or architecture doc pointer explains the module README convention.

done_when:

1. Current modules `contracts`, `ingestion`, `datamesh`, `projections`, `snapshots`, `benchmarks`, `agent`, `merchant-review`, and `evidence` each have a short README or explicitly justified exception.
2. The READMEs restate critical boundaries: POS final fact source, RFM snapshot source, aggregate-only benchmark, Agent draft not truth, validator gate, merchant confirmation, evidence non-causal proof.
3. `git diff --check`, `npm run check:boundaries`, `npm test`, and `npm run typecheck` pass.

stop_boundary:

1. Stop if README writing reveals module responsibility conflicts that require code rearchitecture.
2. Stop before moving modules or changing imports as part of documentation.
3. Stop if docs contradict Zod schema or tests.

必须避免：

1. Do not write verbose tutorial docs; keep them compact and executable.
2. Do not document future surfaces as if implemented.
3. Do not weaken forbidden boundaries to match convenience.

#### `DD-VIBE-S5` — schema and migration safety checker

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `high`

目标：

- Add a lightweight check that guards the most important schema / migration safety contracts from accidental deletion or drift.

交付物：

1. `scripts/check-schema-migration-safety.mjs` or equivalent.
2. `package.json` script `check:schema-migrations`.
3. Checks for critical migration constraints and schema contract strings.
4. Documentation of what the checker protects and what it does not replace.

done_when:

1. `npm run check:schema-migrations` exists and passes.
2. The checker verifies key contract versions and safety constraints, including at minimum `event-contract.v1`, `agent-context-bundle.v1`, `merchant-review.v1`, `evidence-store.v1`, `business_mutation_called = FALSE`, `llm_generated_claims = '[]'`, `final_fact_source = 'pos'`, `source_table = 'report.crm.member_labels'`, aggregate-only peer deidentification, and sample threshold floor `min_peer_store_count >= 3`.
3. `npm run check:schema-migrations`, `npm run check:boundaries`, `npm test`, and `npm run typecheck` pass.
4. Failure messages identify the missing contract or migration path.

stop_boundary:

1. Stop if the checker would require a DB engine, live credentials, or migration execution.
2. Stop if schema/migration drift requires changing business contracts instead of adding a safety check.
3. Stop before replacing SQL migrations with another migration framework.

必须避免：

1. Do not treat grep-style checks as full database integration testing.
2. Do not make the checker brittle to harmless whitespace while missing semantic contract removals.
3. Do not alter migrations except to fix an explicitly proven current inconsistency.

#### `DD-VIBE-S6` — service and worker adapter seam contract

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `medium`

目标：

- Define the production-adapter seam so future API/worker work can wrap pure deterministic modules without pushing DB/I/O clients into Core computation.

交付物：

1. Minimal `src/app/README.md` and optional empty or type-only directories/files for `http`, `repositories`, and `workers` if needed for clarity.
2. Contract describing adapter responsibilities: I/O, transaction boundary, retry, logging, scheduling, repository calls.
3. Contract describing Core responsibilities: deterministic validation/rebuild/assemble functions only.
4. Explicit non-goal that this slice does not implement production Fastify/NestJS routes, Postgres repositories, queue workers, or runtime configuration.

done_when:

1. A future executor can identify where to add `/events`, PostgreSQL raw-event repository, projection worker, snapshot worker, benchmark worker, and evidence worker without modifying pure modules first.
2. The seam doc forbids DB clients inside current deterministic modules.
3. No production runtime behavior is claimed complete.
4. `git diff --check`, `npm run check:boundaries`, `npm run check:schema-migrations`, `npm test`, and `npm run typecheck` pass.

stop_boundary:

1. Stop if implementing actual HTTP routes, DB repositories, worker queue, or runtime configuration becomes necessary.
2. Stop if adapter seam requires choosing Fastify vs NestJS without a production plan.
3. Stop before adding dependencies for web frameworks, DB clients, queues, or observability.

必须避免：

1. Do not create fake production code that appears runnable without DB/runtime ownership.
2. Do not move existing pure functions into app adapters.
3. Do not weaken boundary checks to allow adapters to bypass Core contracts.

#### `DD-VIBE-CLOSEOUT-S1` — guardrail audit and handoff

- Owner: `execution-reality-audit`
- State: `QUEUED`
- Priority: `medium`

目标：

- Audit that vibe-coding guardrails are executable, documented, and aligned with current architecture without claiming production readiness.

交付物：

1. Reality audit over boundary checker, split scripts, ownership policy, module READMEs, schema/migration checker, and adapter seam.
2. Updated `docs/current-architecture-and-vibecoding-review.md` and plan status if recommendations moved from future to implemented.
3. Residual list for CI integration, production API/worker implementation, real DB migration check, and real Pi runtime.
4. Terminal writeback to `VIBE_PACK_COMPLETE` only after accepted evidence.

done_when:

1. README/PLAN/STATUS/WORKSET agree on terminal state or next active pack.
2. All completed guardrail slices have evidence or explicit residuals.
3. `npm run check:boundaries`, `npm run check:schema-migrations`, split test scripts, `npm test`, `npm run typecheck`, `git diff --check`, and `plan_sync docs/plan` pass or documented residuals explain any unavailable check.
4. No production API/worker, external repo integration, or real Agent runtime is claimed complete.

stop_boundary:

1. Stop if any accepted guardrail slice lacks proof and cannot be audited.
2. Stop if production implementation starts during closeout.
3. Stop if parser truth still names any active slice other than `VIBE_PACK_COMPLETE` after closeout writeback.

必须避免：

1. Do not mark full objective done while executable guardrail gaps remain hidden.
2. Do not create a second control-plane root.
3. Do not claim production readiness.

#### `VIBE_PACK_COMPLETE` — terminal parser state

- Owner: `closeout`
- State: `DONE`
- Priority: `terminal`

目标：

- Represent full vibe-coding guardrail pack completion only after all non-deferred stages have accepted review evidence and `DD-VIBE-CLOSEOUT-S1` has updated README/STATUS/WORKSET to terminal truth.

交付物：

1. README `Current Active Slice` is `VIBE_PACK_COMPLETE`.
2. WORKSET `Active Stage` is `VIBE_PACK_COMPLETE` with owner `closeout` and state `DONE`.
3. No non-deferred guardrail stage remains unchecked or unaudited.

done_when:

1. All non-deferred stages have accepted review evidence or explicit deferred residuals.
2. README/PLAN/STATUS/WORKSET parse as terminal `VIBE_PACK_COMPLETE` truth.
3. Repo-local closeout has preserved validation evidence and residual handoff.

stop_boundary:

1. Stop if any previous stage lacks accepted review evidence.
2. Stop if terminal state would hide production, runtime, or external integration residuals.
3. Stop if parser truth still names any active slice other than `VIBE_PACK_COMPLETE`.

必须避免：

1. Do not use wave count, cycle count, or scheduler route as completion proof.
2. Do not mark `VIBE_PACK_COMPLETE` before closeout audit acceptance.

## Exit Criteria

- All active and queued slices carry concrete `done_when` / `stop_boundary`.
- `docs/plan/README.md`, this PLAN, STATUS, and WORKSET agree on active slice and handoff.
- Review handoff remains explicit: `execute` -> `review`; accepted review advances exactly one next slice.
- Full objective closeout uses the repo-local closeout prompt surface.
