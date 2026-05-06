# data-dyna Agent Runtime Integration Workset

## Stage Order

- [x] `DD-P6-S1` boundary-manager contract and no-fallback runtime decision
- [x] `DD-P6-S2` prepared attempt seed and read-only tool surface
- [ ] `DD-P6-S3` single Agent harness and LLM-owned turn loop
- [ ] `DD-P6-S4` runtime tool-boundary enforcement and audit
- [ ] `DD-P6-S5` result boundary, validator, and merchant-review gate
- [ ] `DD-P6-S6` Agent observability, deletion proof, and runbook
- [ ] `DD-P6-CLOSEOUT-S1` P6 closeout audit

## Active Stage

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

## Hard Requirements

- P6 is boundary management, not server-side business-flow management.
- The LLM owns query/reason/draft flow inside the prepared attempt and allowed tool boundary.
- Data Dyna owns identity, worker freshness, context budget, tool policy, runtime selection, audit, redaction, result schemas, validator gate, merchant-review gate, and fail-closed behavior.
- No compatibility code: do not keep old Agent paths, runtime aliases, duplicate adapters, old tool aliases, or transitional abstractions after a slice supersedes them.
- No architecture-iteration fallback: do not silently fall back to fixture mode, legacy adapters, alternate providers, alternate models, relaxed policies, static draft functions, or old pipeline code.
- Delete unnecessary code instead of wrapping it. Obsolete `adapter.draft(...)`, fixture-only runtime paths, allowed-operation lists, static context packers, or automatic flow pipelines must be removed or explicitly owned by a queued slice for deletion.
- Local/test doubles may exist only in tests around the selected architecture; they must not be reachable production fallback paths.
- Missing or ambiguous runtime/provider/model/profile/auth/tool policy fails closed with audit evidence.

## Explicit Risk Guardrails

### Risk 1: `adapter.draft(context)` is forbidden as the runtime shape

- Forbidden shape: server code calls `adapter.draft(context)` or an equivalent static draft function as the primary Agent runtime.
- Required shape: a selected `runAgentAttempt({ preparedAttempt, prompt, tools, policy, runtime, audit })`-style boundary hands a tool-governed turn to the LLM/harness.
- Workset enforcement:
  - `DD-P6-S1` must name `adapter.draft(...)` and fixture-only runtime paths as obsolete compatibility/flow-manager surfaces.
  - `DD-P6-S3` must replace the draft-function adapter shape with a single Agent harness and prove no old adapter path remains reachable in production code.
  - `DD-P6-S6` must include deletion proof for removed compatibility/fallback/flow-manager code.
- Stop if production Agent runtime still centers on `adapter.draft(context)` after `DD-P6-S3` acceptance.

### Risk 2: hidden server-managed business flow is forbidden

- Forbidden shape: server code hardcodes `read summary -> draft -> validate -> submit` or any equivalent automatic business reasoning pipeline.
- Required shape: the LLM chooses allowed read tools and reasoning order; server code only prepares boundaries/tools/prompt/policy/audit and then enforces result schemas, deterministic validator, and merchant-review gates.
- Workset enforcement:
  - `DD-P6-S1` contract must state that validation and merchant review are result gates, not hidden system-managed reasoning flow.
  - `DD-P6-S3` must prove the harness lets the LLM choose allowed tool calls and draft timing.
  - `DD-P6-S5` must prove no automatic submit occurs without accepted result gates and must delete any old automatic draft -> validate -> submit pipeline that bypasses LLM-owned flow.
- Stop if server code owns the query/reason/tool-use sequence or auto-submits review as a hidden workflow step.

### Risk 3: over-constraining the LLM into template filling is forbidden

- Forbidden shape: system preselects the full context and reasoning path so the LLM can only fill a template.
- Required shape: prepared attempt provides a bounded context seed/index plus committed worker freshness refs and read-only tools; the LLM chooses what to inspect within policy.
- Workset enforcement:
  - `DD-P6-S2` must build prepared attempt as context seed plus read-only tool boundary, not a full server-selected transcript.
  - `DD-P6-S2` must delete obsolete static context-packing or allowed-operation flow code when replaced by the prepared-attempt/tool-catalog boundary.
  - `DD-P6-S4` must preserve LLM-owned flow inside the allowed tool catalog while enforcing per-call tool boundaries.
- Stop if context preparation preselects the full reasoning path, scans unbounded raw history, or hides stale/dead-lettered worker outputs behind best-effort context.

## Slice Ownership

### `DD-P6-S1`

- Allowed repo surfaces:
  - `docs/agent/**` or the smallest equivalent P6 boundary-manager contract document.
  - `src/agent/README.md` for a minimal contract link if needed.
  - `docs/plan/*` parser-truth writeback only if needed for planning correction.
- Disallowed surfaces:
  - Provider/runtime implementation before the P6 contract is accepted.
  - Live provider credentials, live LLM calls, Agent sessions against production services, or model auth/profile setup.
  - Compatibility shims, fallback runtime branches, old aliases, dual-stack adapters, or server-owned business-flow orchestration.
  - Direct Core/business mutation tools, raw payload readers, arbitrary SQL, worker mutation tools, or production dashboards/SLOs/incidents.

### `DD-P6-S2`

- Allowed repo surfaces:
  - Minimal prepared attempt schema/repository or local/test equivalent.
  - Read-only context seed and tool-surface interfaces under `src/agent/**` or app-layer adapter seams if persistence is required.
  - Tests under `tests/**` proving worker freshness gating, safe tool catalog, and bounded context seed construction.
- Disallowed surfaces:
  - Provider calls or prompt execution.
  - Arbitrary SQL/raw payload/secret reads.
  - Worker job mutation or Core fact writes.
  - Keeping static full-context packers or allowed-operation flow lists after the tool-catalog boundary supersedes them.

### `DD-P6-S3`

- Allowed repo surfaces:
  - One selected Agent harness/runtime path under `src/agent/**`.
  - Prompt/tool/audit handoff code that lets the LLM own the turn loop.
  - Tests for success, missing config/auth/model/profile/policy, provider/runtime failure audit, and no fallback path.
- Disallowed surfaces:
  - Real network provider calls from default tests.
  - Secret logging or persisted provider credentials.
  - Fixture fallback, legacy adapter fallback, alternate provider/model fallback, relaxed-policy fallback, or old `adapter.draft(...)` production path after replacement.
  - Server code that hardcodes the business reasoning/tool-use sequence.

### `DD-P6-S4`

- Allowed repo surfaces:
  - Agent tool descriptor/policy code under `src/agent/**`.
  - Runtime call gate, tool-result sanitizer, and audit record fields for allowed/denied tools and policy version.
  - Tests for allowed/forbidden tools, per-call enforcement, sanitized results, and no harness invocation after policy denial.
- Disallowed surfaces:
  - Direct mutation tools for facts, workers, menus, prices, coupons, customer messages, evidence promotion, or arbitrary SQL.
  - Policy overrides from free-form Agent/provider output.
  - Old tool names kept as aliases for compatibility.

### `DD-P6-S5`

- Allowed repo surfaces:
  - Agent result parsing, deterministic validator, and merchant-review handoff adapters under `src/agent/**` or existing merchant-review/evidence seams.
  - Tests spanning valid draft, invalid draft, forbidden mutation, missing evidence, bypass attempts, and no automatic submit without result-gate acceptance.
  - Minimal docs/runbook updates for validator/review gate behavior.
- Disallowed surfaces:
  - Business mutation execution.
  - LLM output as evidence fact or merchant decision.
  - Review submission that implies merchant approval.
  - Automatic server-managed draft -> validate -> submit pipeline if it bypasses LLM-owned flow or hides gate decisions.

### `DD-P6-S6`

- Allowed repo surfaces:
  - Agent observability/audit helpers under `src/agent/**` and existing app observability modules if needed.
  - Local/test probe script for Agent runtime boundary.
  - Runbook docs under `docs/agent/**`.
  - Deletion audit documentation for removed compatibility/fallback/flow-manager surfaces.
- Disallowed surfaces:
  - Production dashboard/paging/SLO/incident implementation as a correctness prerequisite.
  - Secret/raw-payload/customer/payment/provider-key leakage in telemetry.
  - Exactly-once, production cost, or fallback guarantees without proof.
  - Documenting fallback as an operator option.

### `DD-P6-CLOSEOUT-S1`

- Allowed repo surfaces:
  - `docs/plan/*` parser-truth closeout writeback.
  - P6 docs/runbooks only for residual or deletion-audit clarification discovered during audit.
- Disallowed surfaces:
  - New Agent runtime implementation during closeout.
  - Marking `PACK_COMPLETE` while non-deferred P6 stages remain unchecked.
  - Hiding production operations, Agent safety residuals, compatibility code, fallback paths, or server-owned business-flow orchestration.

## Current Technical Consensus

- P6 starts only because P2/P3/P4/P5 packs are terminal with accepted evidence.
- The active concrete pack is `data-dyna-agent-runtime-integration`.
- P6 must consume P5 durable worker outputs through prepared, read-only, worker-fresh boundaries; it must not scan unbounded raw history or rely on chat memory.
- The runtime must be OpenClaw-like: host owns boundaries and policy; LLM/harness owns the turn flow.
- Agent output is draft/hypothesis only and must pass deterministic validator plus merchant-review gates before any business action is considered.
- No compatibility or fallback code should survive once a slice supersedes it; remove unneeded code instead of preserving it.

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

Escalate as later slices touch runtime, review, evidence, observability, persistence, or deletion proof:

```bash
npm run test:agent
npm run test:review
npm run test:evidence
npm run test:app:workers
npm run probe:observability
npm run check:boundaries
npm run typecheck
npm test
npm run check:plan
git diff --check
```

## Continuous Autopilot Wave Ladder

| Wave | Slice | Owner | Acceptance handoff |
|---|---|---|---|
| `wave-1` | `DD-P6-S1` boundary-manager contract/no-fallback decision | `execute-plan` -> `execution-reality-audit` | accept -> activate `DD-P6-S2` |
| `wave-2` | `DD-P6-S2` prepared attempt seed/read-only tools | `execute-plan` -> `execution-reality-audit` | accept -> activate `DD-P6-S3` |
| `wave-3` | `DD-P6-S3` single harness/LLM-owned turn loop | `execute-plan` -> `execution-reality-audit` | accept -> activate `DD-P6-S4` |
| `wave-4` | `DD-P6-S4` runtime tool-boundary enforcement/audit | `execute-plan` -> `execution-reality-audit` | accept -> activate `DD-P6-S5` |
| `wave-5` | `DD-P6-S5` result boundary/validator/merchant-review gate | `execute-plan` -> `execution-reality-audit` | accept -> activate `DD-P6-S6` |
| `wave-6` | `DD-P6-S6` observability/deletion proof/runbook | `execute-plan` -> `execution-reality-audit` | accept -> activate `DD-P6-CLOSEOUT-S1` |
| `wave-closeout` | `DD-P6-CLOSEOUT-S1` closeout audit | `execution-reality-audit` | accept -> `PACK_COMPLETE`, then master writeback |

## Autopilot Transition Contract

- `wave_plan/completed` -> `execute` same active slice if wave planning is dispatched.
- `execute/completed` -> same-slice `review`; do not advance the active slice during execute.
- `review/completed` + accepted evidence -> write README/STATUS/WORKSET, mark the reviewed slice done, activate the next unchecked `Stage Order` item, and route to next `wave_plan` or `execute`.
- `review/continue` -> keep the same active slice and route to `execute` for residual in-scope work.
- `needs_replan` -> `replan` with `plan-creator`.
- `blocked` / `failed` -> stop and preserve blocker evidence in STATUS.
- `done` is reserved for full objective closeout after parser truth is `PACK_COMPLETE`.
- If `closeout` is dispatched while active slice is not `PACK_COMPLETE`, treat it as premature and hand back to the active slice owner.

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

## Machine Queue

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