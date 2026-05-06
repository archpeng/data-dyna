# data-dyna Agent Runtime Integration Status

## Current State

- state: `READY_FOR_EXECUTE`
- owner: `execute-plan`
- route: `PLAN -> EXEC -> REVIEW -> REPLAN -> CLOSEOUT`
- workstream: `data-dyna-agent-runtime-integration`
- pack_mode: `single-root docs/plan machine-compatible active-pack`
- source_truth: `docs/roadmap/data-dyna-production-readiness-roadmap.md`, completed P2 auth/tenancy pack, completed P3 observability pack, completed P4 external producer integration pack, completed P5 durable worker foundation pack, accepted P6 Agent-runtime handoff packet, OpenClaw Pi/harness boundary references

## Current Step

- active_step: `DD-P6-S3`
- active_wave: `wave-3`
- mode: `ready_for_execute`
- intended_handoff: `execute-plan`

## Planned Stages

- [x] `DD-P6-S1` boundary-manager contract and no-fallback runtime decision
- [x] `DD-P6-S2` prepared attempt seed and read-only tool surface
- [ ] `DD-P6-S3` single Agent harness and LLM-owned turn loop
- [ ] `DD-P6-S4` runtime tool-boundary enforcement and audit
- [ ] `DD-P6-S5` result boundary, validator, and merchant-review gate
- [ ] `DD-P6-S6` Agent observability, deletion proof, and runbook
- [ ] `DD-P6-CLOSEOUT-S1` P6 closeout audit

## Immediate Focus

### `DD-P6-S3`

- Owner: `execute-plan`
- State: `READY_FOR_EXECUTE`
- Priority: `high`

目标：

- Replace the draft-function adapter shape with one selected OpenClaw-like Agent harness path that runs a prepared LLM turn under Data Dyna boundaries and has no runtime/provider/model fallback.

必须交付：

1. Runtime invocation accepts prepared attempt, prompt/system instructions, read-only tools, tool policy, selected provider/model/profile/runtime, session/run audit store, and callbacks.
2. The harness lets the LLM choose allowed tool calls and draft timing; server code does not orchestrate a fixed business reasoning sequence.
3. Runtime selection is strict: missing or ambiguous provider/model/profile/auth/tool policy fails closed and records safe audit evidence; no fixture, legacy adapter, alternate provider, alternate model, or relaxed-policy fallback remains reachable.
4. Tests prove successful local/test harness execution, missing config/auth/model/profile/policy denial, provider/runtime failure audit, and deletion/replacement of obsolete `adapter.draft(...)` or fixture-only runtime paths where superseded.

done_when:

1. Agent runtime invocation cannot occur without a prepared attempt, accepted tool policy, selected runtime/provider/model/profile, prompt ref, and audit store.
2. The accepted runtime path gives the LLM a tool-governed turn loop rather than a server-side `draft()` function that decides the flow.
3. Provider/runtime unavailable or misconfigured paths fail closed with safe audit evidence and no secret leakage.
4. No compatibility runtime, fixture fallback, provider fallback, model fallback, or old adapter path remains reachable in production code.
5. `npm run test:agent`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if live provider calls are made from default tests without explicit safe credentials and policy proof.
2. Stop if provider secrets, prompts with sensitive payloads, or model auth values are logged or persisted unsafely.
3. Stop if adapter output can request Core/business mutations or bypass draft-only result validation.
4. Stop if provider/runtime failure loses audit evidence or routes through a fallback path.
5. Stop if server code owns the reasoning/tool-use sequence instead of the LLM/harness.

必须避免：

1. Do not make production provider availability a prerequisite for local/test acceptance.
2. Do not keep fixture/legacy adapters as compatibility paths after the selected harness owns the behavior.
3. Do not treat any local/test harness output as merchant-approved or production model behavior.
## Current Wave Handoff

- wave_id: `wave-3`
- parent_step: `DD-P6-S3`
- selected_slice: `DD-P6-S3`
- next_handoff: `execute-plan`

Wave-plan result for execution:

1. Replace `src/agent/agent-sidecar.ts`'s production-shaped `adapter.draft(context)` boundary with a single selected `runAgentAttempt({ preparedAttempt, prompt, tools, policy, runtime, audit })` harness surface under `src/agent/**`.
2. Define strict runtime inputs for prepared attempt, prompt ref, read-only S2 tools, tool-policy/catalog version, selected provider/model/profile/runtime/auth reference, audit store, and LLM/harness callbacks; fail closed before invocation if any required boundary input is missing, ambiguous, stale, blocked, or mismatched.
3. Use an explicit local/test harness double only as the selected test runtime passed into `runAgentAttempt`; do not keep fixture/provider/model/legacy adapter fallback branches or `adapter.draft(...)` aliases reachable from production code.
4. Prove LLM-owned flow by recording an ordered harness callback/tool-choice transcript supplied by the test harness, not a server-hardcoded `read summary -> draft -> validate -> submit` sequence.
5. Update or replace existing agent sidecar tests so `npm run test:agent` proves successful local/test harness execution, missing prepared attempt/prompt/runtime/auth/profile/policy denial, provider/runtime failure audit, no secret leakage, draft-only/no Core-write output, and deletion/replacement of obsolete adapter/fixture surfaces.

Likely execution surfaces: `src/agent/agent-sidecar.ts` or a replacement `src/agent/agent-attempt-harness.ts`, `src/agent/prepared-attempt.ts`, `src/agent/README.md`, `tests/agent-dd-p3-s1.spec.ts`, a new or replacement `tests/agent-runtime-harness-s3.spec.ts`, `package.json`, and parser truth under `docs/plan/*`.

Exit criteria for execute: S3 implementation is ready for same-slice review only after the selected harness path exists, old `adapter.draft(...)`/fixture fallback production path is deleted or no longer imported by production-shaped tests, all S3 fail-closed/audit/no-secret proofs pass, and the active validation ladder passes.

## Current Technical Consensus

- P6 starts only because P2 auth/tenancy, P3 observability, P4 external producer integration, and P5 durable worker foundation reached `PACK_COMPLETE` with accepted evidence.
- P6 must be an OpenClaw-like boundary manager: Data Dyna prepares a safe attempt, tools, policy, prompt, audit, and result gates; the LLM owns query/reason/draft flow inside those boundaries.
- Existing Agent code (`AgentContextBundle`, safe tool descriptors, fixture sidecar execution, draft-only output, no-direct-mutation tests) is not sacred compatibility surface. P6 may delete or replace it when a simpler boundary-manager path supersedes it.
- Hard rule: no compatibility code, no old aliases, no dual-stack adapter paths, no fixture/provider/model/runtime fallback, and no architecture-iteration fallback. Missing or ambiguous runtime state fails closed.
- Agent output remains draft/hypothesis only. Deterministic validator and merchant-review gates remain required before any business action is considered.
- Production dashboards, paging, mature SLOs, incident management, cloud secrets, production deployment hardening, capacity planning, and exactly-once claims remain residual unless a later accepted pack owns them.

## Expected Validation Ladder

Always run after parser-truth edits:

```bash
npm run check:plan
git diff --check
```

For the active `DD-P6-S3` harness/runtime slice:

```bash
npm run test:agent
npm run check:boundaries
npm run typecheck
npm test
npm run check:plan
git diff --check
```

Escalate as P6 adds runtime harness, policy enforcement, validator/review gates, observability, or deletion proof:

```bash
npm run test:agent
npm run test:review
npm run test:evidence
npm run probe:observability
npm run check:boundaries
npm run typecheck
npm test
npm run check:plan
git diff --check
```

Run worker and DB gates only when P6 changes worker freshness repository or persistence contracts:

```bash
npm run test:db:migrations
npm run test:app:workers
```

## Blockers

- None currently known for `DD-P6-S3` execution.
- Live provider credentials, production Agent deployment, cloud secrets, production dashboards/SLOs/paging/incidents, and mature model operations are not prerequisites for S2 and remain residual unless a later P6 slice explicitly accepts them.

## Residuals / Notes

- Agent must not receive arbitrary SQL, raw payload reads, secret reads, worker mutation tools, Core writes, direct business mutations, or direct evidence fact promotion.
- P6 should choose one clean runtime/harness architecture. If a feature is not needed for that architecture, delete it instead of wrapping it for compatibility.
- Local/test doubles are allowed only as tests around the selected boundary; they must not become production fallback paths.
- Production operations remain residual unless an accepted slice explicitly implements and validates them.

## Master Writeback Evidence

- `data-dyna-durable-worker-foundation` reached `PACK_COMPLETE` with accepted closeout evidence.
- P5 evidence covers PostgreSQL worker jobs/attempts/checkpoints/dead letters, app-layer repository transitions, bounded deterministic executors, checkpoint recovery, idempotent rerun, retry/dead-letter audit, redaction-safe diagnostics, local/test worker observability/probe/runbook, and P6 handoff residuals.
- Master tracker writeback marks `DD-PR-MASTER-P5` done and activates `DD-PR-MASTER-P6`; this pack is the concrete P6 Agent runtime integration queue.
- P6 replan hardened the pack around boundary management, LLM-owned flow, and no compatibility/fallback/dead-code preservation.

## Latest Execution Evidence

### `DD-P6-S3` wave_plan wave-3

- Planned S3 as a single selected Agent harness execution slice, not a broad runtime/provider rollout.
- Execution should replace the production-shaped `adapter.draft(context)` boundary with `runAgentAttempt({ preparedAttempt, prompt, tools, policy, runtime, audit })`, using explicit local/test harness doubles only as selected test runtimes.
- Planned proof covers strict prepared-attempt/prompt/runtime/profile/auth/policy gates, LLM-owned tool-choice transcript, provider/runtime failure audit, no secret leakage, no fixture/legacy fallback path, and full S3 validation.
- Next deterministic handoff: `execute-plan` for `DD-P6-S3`; do not advance to `DD-P6-S4` before same-slice review accepts S3 evidence.

### `DD-P6-S2` review wave-2

- Review accepted S2 after repairing small proof gaps in `src/agent/prepared-attempt.ts` and `tests/agent-prepared-attempt-s2.spec.ts`.
- Added source-scope mismatch fail-closed behavior, exposed `read_dead_letter_diagnosis` on the typed read-only tool surface for blocked dead-letter attempts, and added tool-result budget proof.
- Validation passed: `npm run test:agent`; `npm run test:app:workers`; `npm run check:boundaries`; `npm run typecheck`; `npm test`; `npm run check:plan`; `git diff --check`.
- Parser truth advanced to `DD-P6-S3` for single Agent harness and LLM-owned turn loop wave planning.

### `DD-P6-S2` execute wave-2

- Added `src/agent/prepared-attempt.ts` with local/test prepared-attempt repository, deterministic context seed/hash, committed worker freshness refs, read-only tool catalog/surface, forbidden capability list, context budget gates, and blocked/prepared statuses.
- Added `tests/agent-prepared-attempt-s2.spec.ts` and wired it into `package.json` `test:agent` and full `test` coverage.
- Updated `src/agent/README.md` to identify `prepared-attempt.ts` as the S2 prepared-attempt/tool-boundary proof.
- Validation passed: `npm run test:agent`; `npm run test:app:workers`; `npm run check:boundaries`; `npm run typecheck`; `npm test`; `npm run check:plan`; `git diff --check`.
- Next deterministic handoff: same-slice `review` via `execution-reality-audit`; do not mark `DD-P6-S2` done until review accepts the evidence.

### `DD-P6-S1` review wave-1

- Review accepted `docs/agent/agent-runtime-boundary-contract.md` as satisfying the P6 boundary-manager contract and no-fallback runtime decision slice.
- Review reran validation: `npm run test:agent`; `npm run check:plan`; `git diff --check`.
- Parser truth advanced to `DD-P6-S2` for prepared attempt seed and read-only tool surface execution.

### `DD-P6-S1` execute wave-1

- Created `docs/agent/agent-runtime-boundary-contract.md` as the P6 boundary-manager contract artifact.
- Added `tests/agent-runtime-contract-s1.spec.ts` and wired it into `package.json` `test:agent` and full `test` coverage.
- Updated `src/agent/README.md` to link the S1 contract and mark existing fixture/`adapter.draft(...)` surfaces as pre-P6 raw material, not compatibility fallback.
- Validation passed: `npm run test:agent`; `npm run check:plan`; `git diff --check`.

## Machine State

- active_step: `DD-P6-S3`
- latest_completed_step: `DD-P6-S2`
- intended_handoff: `execute-plan`
- latest_closeout_summary: Accepted DD-P6-S2 and activated DD-P6-S3.
- latest_verification:
  - `Confirmed prepared attempts record freshness refs, seed hash, budgets, catalog version, forbidden capabilities, statuses, and safe failure reasons.`
  - `Added source-scope mismatch fail-closed proof, typed read_dead_letter_diagnosis tool-surface proof, and tool-result budget proof.`
  - `Validation passed: npm run test:agent; npm run test:app:workers; npm run check:boundaries; npm run typecheck; npm test; npm run check:plan; git diff --check.`
  - `Post-writeback checks passed: npm run check:plan; git diff --check; npm run test:agent; plan_sync reports active pack done=2 pending=5.`
  - `src/agent/prepared-attempt.ts`
  - `tests/agent-prepared-attempt-s2.spec.ts`
  - `docs/plan/README.md`
  - `docs/plan/data-dyna-agent-runtime-integration_PLAN.md`
  - `docs/plan/data-dyna-agent-runtime-integration_STATUS.md`
  - `docs/plan/data-dyna-agent-runtime-integration_WORKSET.md`