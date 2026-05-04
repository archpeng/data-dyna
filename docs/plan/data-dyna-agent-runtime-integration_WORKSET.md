# data-dyna Agent Runtime Integration Workset

## Stage Order

- [ ] `DD-P6-S1` boundary-manager contract and no-fallback runtime decision
- [ ] `DD-P6-S2` prepared attempt seed and read-only tool surface
- [ ] `DD-P6-S3` single Agent harness and LLM-owned turn loop
- [ ] `DD-P6-S4` runtime tool-boundary enforcement and audit
- [ ] `DD-P6-S5` result boundary, validator, and merchant-review gate
- [ ] `DD-P6-S6` Agent observability, deletion proof, and runbook
- [ ] `DD-P6-CLOSEOUT-S1` P6 closeout audit

## Active Stage

### `DD-P6-S1`

- Owner: `execute-plan`
- State: `READY`
- Priority: `critical`

目标：

- Define the concrete P6 Agent boundary-manager contract, OpenClaw-like LLM-owned turn model, selected runtime/harness path, and hard no-compatibility/no-fallback deletion policy before implementation expands the Agent path.

必须交付：

1. A P6 contract document states that Data Dyna manages boundaries while the LLM owns query/reason/draft flow inside those boundaries.
2. The contract defines prepared attempt, worker freshness refs, context seed/index, tool catalog, runtime policy gates, selected runtime/harness path, session/run audit, result schema, validator gate, merchant-review gate, and residuals.
3. The contract maps accepted P5 handoff capabilities into P6 read-only tools without arbitrary SQL, raw payload, secret, worker mutation, Core write, business mutation, or evidence-promotion authority.
4. The contract names obsolete compatibility/flow-manager surfaces to remove or replace in later slices, including any fixture-only runtime path or `adapter.draft(...)` abstraction that would bypass the LLM-owned turn loop.
5. Parser truth remains aligned on this P6 pack and active slice.

done_when:

1. P6 boundary-manager and selected runtime/harness decision is documented with fail-closed behavior for missing or ambiguous provider/model/profile/auth/tool policy.
2. The contract explicitly says no compatibility code, no architecture-iteration fallback, no fixture fallback, no provider/model/runtime fallback, and delete obsolete code rather than wrapping it.
3. Prepared attempt, worker freshness refs, context budget, allowed read tools, forbidden capabilities, tool policy lifecycle, audit lifecycle, validator gate, and merchant-review gate are documented as the only path to Agent invocation and result acceptance.
4. No live provider credential, live LLM call, direct Core write, direct business mutation, raw payload read, arbitrary SQL, secret-read claim, or server-owned business-flow orchestration is introduced.
5. `npm run test:agent`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if P6 requires live provider credentials, cloud deployment, production dashboarding, paging, or incident process before the contract can be accepted.
2. Stop if the contract lets server code manage the business reasoning flow instead of only preparing boundaries, tools, prompt, policy, audit, and result gates.
3. Stop if the contract allows Agent output to become fact, evidence, merchant decision, or business action without deterministic validator and merchant-review gates.
4. Stop if the contract grants arbitrary SQL, raw payload, secret, worker mutation, Core write, business mutation, evidence promotion, compatibility fallback, or alternate runtime fallback authority.
5. Stop if parser truth drifts from the active P6 pack or active slice.

必须避免：

1. Do not implement provider/runtime code before the P6 contract is accepted.
2. Do not preserve compatibility code or fallback branches for future convenience.
3. Do not use the P5 handoff document to skip concrete P6 proof.

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

For the active `DD-P6-S1` contract slice:

```bash
npm run test:agent
npm run check:plan
git diff --check
```

Escalate as later slices touch runtime, review, evidence, observability, worker freshness, persistence, or deletion proof:

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

## Machine Queue

- active_step: `DD-P6-S1`
- latest_completed_step: `DD-PR-MASTER-P5`
- intended_handoff: `execute-plan`
- active_concrete_pack: `data-dyna-agent-runtime-integration`
- latest_closeout_summary: P5 durable worker foundation closed; P6 Agent runtime integration is active and reworked around boundary management, LLM-owned flow, and no compatibility/fallback code.
- latest_verification:
  - `data-dyna-durable-worker-foundation STATUS/WORKSET are PACK_COMPLETE with done=7 pending=0.`
  - `P5 residuals and P6 successor handoff are preserved in docs/workers/p6-agent-runtime-handoff.md, docs/workers/durable-worker-foundation.md, src/app/workers/README.md, and docs/plan.`
  - `Concrete P6 Agent runtime integration pack is active with DD-P6-S1 ready for execute-plan.`
  - `P6 workset hard requirements now prohibit compatibility code, architecture-iteration fallback, fixture/provider/model/runtime fallback, old aliases, and server-owned business-flow orchestration.`
