# data-dyna Agent Runtime Integration Workset

## Stage Order

- [x] `DD-P6-S1` boundary-manager contract and no-fallback runtime decision
- [x] `DD-P6-S2` prepared attempt seed and read-only tool surface
- [x] `DD-P6-S3` single Agent harness and LLM-owned turn loop
- [x] `DD-P6-S4` runtime tool-boundary enforcement and audit
- [x] `DD-P6-S5` result boundary, validator, and merchant-review gate
- [x] `DD-P6-S6` Agent observability, deletion proof, and runbook
- [x] `DD-P6-CLOSEOUT-S1` P6 closeout audit

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
## Current Wave Handoff

- wave_id: `wave-closeout`
- parent_step: `DD-P6-CLOSEOUT-S1`
- selected_slice: `DD-P6-CLOSEOUT-S1`
- next_handoff: `autopilot-closeout`

Closeout result: P6 accepted after auditing boundary-manager contract, prepared attempt/read-only tools, selected harness, runtime tool policy, draft-only result boundary, validator/merchant-review gate, observability/probe/runbook, deletion proof, residual handoff, parser truth, and master tracker recommendation. Parser truth now marks this pack `PACK_COMPLETE`.

Master tracker recommendation: route `master_plan` / `plan-creator` after repo-local closeout to mark `DD-PR-MASTER-P6` done and activate `DD-PR-MASTER-CLOSEOUT-S1`.

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

For the active `DD-P6-S6` Agent observability, deletion proof, and runbook slice:

```bash
npm run test:agent
npm run test:review
npm run probe:observability
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

### `DD-P6-CLOSEOUT-S1` closeout review

- Review audited accepted P6 evidence across the boundary-manager contract, prepared attempt/read-only tool surface, selected harness, runtime tool policy, draft-only result boundary, validator/merchant-review gate, Agent observability/probe/runbook, deletion audit, parser truth, residual handoff, and master tracker recommendation.
- Verdict: accepted with successor residuals for production dashboards, paging, mature SLOs, incident management, cloud secrets, deployment hardening, capacity planning, production model operations, live provider rollout, and any future accepted Agent limitations.
- Validation during closeout review: `npm run test:agent`; `npm run test:review`; `npm run test:evidence`; `npm run probe:observability`; `npm run check:boundaries`; `npm run typecheck`; `npm test`; `npm run check:plan`; `git diff --check`; plan_sync.
- Parser truth now marks this pack `PACK_COMPLETE`; repo-local closeout prompt surface is the only next route for this completed pack.

### `DD-P6-S6` review wave-6

- Review confirmed `src/agent/observability.ts` builds a bounded local/test report with prepared-attempt, policy, runtime-selection, harness, tool-call, tool-denial, sanitized-result, draft-capture, validator, review-handoff, and provider/runtime-failure coverage booleans.
- Review confirmed `src/agent/agent-sidecar.ts` records `runtimeUsage` and latency on `draft_captured`, latency and redacted reason on `run_failed`, rejects sensitive prompt/runtime selection text before harness invocation, and redacts transcript/tool-result/error summaries.
- Review confirmed `scripts/probe-agent-runtime-observability.ts` demonstrates successful selected runtime, denied tool call, provider/runtime failure, sensitive prompt blocking, validator rejection, merchant-review request, runtime usage/cost metadata, and deletion proof without live provider or production infrastructure.
- Review confirmed deletion proof scans production Agent sources for removed compatibility/fallback surfaces; remaining `draft_experiment_plan` strings are draft-operation labels in `context-bundle.ts`, not active runtime tool aliases or fallback paths.
- Targeted review validation passed: `npm run test:agent`; `npm run probe:observability`; `npm run check:boundaries`; `npm run typecheck`.
- Parser truth advanced to `DD-P6-CLOSEOUT-S1` for P6 closeout audit.

### `DD-P6-S6` execute wave-6

- Added `src/agent/observability.ts` to build bounded local/test Agent runtime observability reports from audit events, including event counts, coverage booleans, local metric counters, latency, optional runtime usage/cost metadata, deletion proof, and residual operations notes.
- Extended `src/agent/agent-sidecar.ts` to carry optional runtime usage metadata on captured drafts, record latency on `draft_captured` and `run_failed`, and redact raw-payload/customer/payment/provider-secret patterns from runtime failure text before audit persistence.
- Added `scripts/probe-agent-runtime-observability.ts` and wired it into `npm run test:agent`, `npm run probe:observability`, and `npm test`; the probe proves success, denied policy/tool call, provider/runtime failure, validator rejection, review handoff request, safe bounded output, runtime usage/cost fields, and deletion proof.
- Added `docs/agent/agent-runtime-observability-runbook.md` and `docs/agent/agent-runtime-deletion-audit.md`; production dashboards/SLOs/paging/incidents and cloud secret/deployment hardening remain residual operations maturity.
- Validation passed: `npm run test:agent`; `npm run test:review`; `npm run probe:observability`; `npm run check:boundaries`; `npm run typecheck`; `npm test`; `npm run check:plan`; `git diff --check`.
- Next deterministic handoff: same-slice review via `execution-reality-audit`; do not advance to `DD-P6-CLOSEOUT-S1` before review accepts S6 evidence.

### `DD-P6-S5` review wave-5

- Review confirmed `src/agent/result-boundary.ts` keeps Agent drafts as `agent_draft_not_core_truth`, parses deterministic hypothesis/experiment-plan artifacts, runs `validateExperimentPlan`, audits `draft_validation_evaluated`, and blocks merchant-review requests unless validation accepts.
- Review confirmed merchant-review request handoff is explicit and auditable: `merchant_review_requested` records `merchantApprovalImplied=false` and `businessMutationCalled=false`, while `submitExperimentPlanForMerchantReview` still rejects non-accepted validator results.
- Review found and repaired one in-scope deletion gap: the old static fixture draft helper remained exported from production `src/agent/experiment-plan.ts`. It was moved to `tests/support/experiment-plan-fixture.ts`, and `tests/agent-runtime-result-boundary-s5.spec.ts` now proves the production Agent plan module no longer exposes that helper.
- Validation passed after review repair: `npm run test:agent`; `npm run test:review`; `npm run test:evidence`; `npm run check:boundaries`; `npm run typecheck`; `npm test`; `npm run check:plan`; `git diff --check`.
- Parser truth advanced to `DD-P6-S6` for Agent observability, deletion proof, and runbook execution.

### `DD-P6-S5` execute wave-5

- Added `src/agent/result-boundary.ts` to parse captured Agent drafts into deterministic `InterventionHypothesis` and `ExperimentPlan` artifacts, run `validateExperimentPlan`, and audit `draft_validation_evaluated` before any merchant-review request is allowed.
- Added explicit `requestMerchantReviewForAgentDraft(...)` handoff that calls the existing merchant-review submission seam only after an accepted validation gate, audits `merchant_review_requested`, sets `merchantApprovalImplied=false`, and never executes business mutations.
- Kept `runAgentAttempt` as draft-capture only; S5 tests prove no automatic merchant-review submit occurs during the harness turn.
- Added `tests/agent-runtime-result-boundary-s5.spec.ts` and wired it into `npm run test:agent` / `npm test`; tests cover valid draft review request, missing evidence, invented evidence, forbidden Core-write draft failure, bypassed blocked-validation submission, and audit events.
- Updated `migrations/0005_agent_runs.sql`, `src/agent/README.md`, `docs/agent-sidecar-v1.md`, `docs/agent-experiment-plan-v1.md`, and `src/agent/context-bundle.ts` for result-gate terminology and audit events.
- Validation passed: `npm run test:agent`; `npm run test:review`; `npm run test:evidence`; `npm run check:boundaries`; `npm run typecheck`; `npm test`; `npm run test:db:migrations`; `npm run check:schema-migrations`; `npm run check:plan`; `git diff --check`.
- Next deterministic handoff: same-slice review via `execution-reality-audit`; do not advance to `DD-P6-S6` before review accepts S5 evidence.

### `DD-P6-S4` review wave-4

- Review confirmed `runAgentAttempt` rejects unregistered tool surfaces before `harness_invoked`, wraps every runtime tool call, emits auditable `tool_call_attempt` / `tool_call_denied` / `tool_result_sanitized` events, redacts and bounds tool results, and passes the harness a frozen runtime policy.
- Review found and repaired one in-scope drift: `src/agent/agent-tools.ts` still allowed old P3 tool names (`draft_experiment_plan`, `validate_experiment_plan`, `submit_for_merchant_review`) through its safe policy helper. The active safe policy surface now lists only the P6 prepared read-only tool names, and `tests/agent-dd-p3-s2.spec.ts` proves the old draft tool name is denied.
- Validation passed after review repair: `npm run test:agent`; `npm run check:boundaries`; `npm run typecheck`; `npm test`; `npm run test:db:migrations`; `npm run check:schema-migrations`; `npm run check:plan`; `git diff --check`.
- Parser truth advanced to `DD-P6-S5` for result boundary, validator, and merchant-review gate execution.

### `DD-P6-S4` execute wave-4

- Added an async runtime tool boundary in `src/agent/agent-sidecar.ts` so `runAgentAttempt` rejects unregistered tool surfaces before harness invocation and passes the harness only policy-wrapped tools.
- Added per-call audit events for `tool_call_attempt`, `tool_call_denied`, and `tool_result_sanitized`, including policy version, mutation policy, allowed tools, denied reasons, and sanitized result byte counts.
- Froze accepted runtime policy before passing it to the harness so provider/model code cannot expand `allowedToolNames` or override default-deny behavior.
- Added `tests/agent-runtime-tool-boundary-s4.spec.ts` and wired it into `npm run test:agent` / `npm test`; updated S3 harness tests for audited tool events.
- Updated `migrations/0005_agent_runs.sql`, `src/agent/README.md`, and `docs/agent-sidecar-v1.md` for S4 tool-boundary audit events and behavior.
- Validation passed: `npm run test:agent`; `npm run check:boundaries`; `npm run typecheck`; `npm test`; `npm run check:plan`; `git diff --check`; `npm run test:db:migrations`; `npm run check:schema-migrations`.
- Next deterministic handoff: same-slice review via `execution-reality-audit`; do not advance to `DD-P6-S5` before review accepts S4 evidence.

### `DD-P6-S3` review wave-3

- Review accepted S3 after repairing the callback/model/profile/harness proof gap in `src/agent/agent-sidecar.ts`, `tests/agent-runtime-harness-s3.spec.ts`, `src/agent/README.md`, and `docs/agent-sidecar-v1.md`.
- Confirmed `runAgentAttempt` requires prepared attempt, accepted policy, selected provider/model/profile/runtime/auth ref, prompt, read-only tools, audit store, and harness callbacks before runtime invocation.
- Confirmed local/test selected harness owns tool order and transcript; server records audit/transcript events and does not call an `adapter.draft(...)` path.
- Validation passed: `npm run test:agent`; `npm run check:boundaries`; `npm run typecheck`; `npm test`; `npm run check:plan`; `git diff --check`; `npm run test:db:migrations`; `npm run check:schema-migrations`.
- Parser truth advanced to `DD-P6-S4` for runtime tool-boundary enforcement and audit wave planning.

### `DD-P6-S3` execute wave-3

- Replaced the production-shaped `adapter.draft(context)` sidecar with `runAgentAttempt({ preparedAttempt, prompt, tools, policy, runtime, audit })` in `src/agent/agent-sidecar.ts`.
- Added selected runtime/provider/model/profile/auth/prompt/policy gates, prepared-attempt consumability checks, redaction-safe failure audit, and harness-supplied transcript events proving LLM/harness-owned tool order.
- Added `tests/agent-runtime-harness-s3.spec.ts` and wired it into `npm run test:agent` / `npm test`; updated legacy P3 sidecar tests to focus on context/migration boundaries.
- Updated `docs/agent-sidecar-v1.md`, `src/agent/README.md`, and `migrations/0005_agent_runs.sql` for the harness/audit schema and removed obsolete fixture/adapter production surface.
- Validation passed: `npm run test:agent`; `npm run check:boundaries`; `npm run typecheck`; `npm run test:db:migrations`; `npm test`; `npm run check:plan`; `git diff --check`.
- Next deterministic handoff: same-slice review via `execution-reality-audit`; do not advance to `DD-P6-S4` before review accepts S3 evidence.

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

- active_step: `PACK_COMPLETE`
- latest_completed_step: `PACK_COMPLETE`
- intended_handoff: `autopilot-closeout`
- latest_closeout_summary: P6 Agent runtime integration closeout is complete.
- latest_verification:
  - `Completed waves: S1 boundary contract; S2 prepared attempts/tools; S3 selected harness; S4 default-deny runtime tool boundary; S5 draft-only result gate and merchant-review request; S6 observability/probe/deletion proof; closeout audit.`
  - `Validation gathered: npm run test:agent; npm run test:review; npm run test:evidence; npm run probe:observability; npm run check:boundaries; npm run typecheck; npm test; npm run check:plan; git diff --check.`
  - `Current closeout verification: npm run check:plan passed; git diff --check passed; plan_sync docs/plan reports data-dyna-agent-runtime-integration STATUS/WORKSET done=7 pending=0.`
  - `Safety evidence: Agent remains draft-only, read-only tool bounded, default-deny, validator/merchant-review gated, redaction/audit covered, and deletion proof reports obsolete runtime/fallback surfaces removed from production.`
  - `docs/plan/README.md`
  - `docs/plan/data-dyna-agent-runtime-integration_PLAN.md`
  - `docs/plan/data-dyna-agent-runtime-integration_STATUS.md`
  - `docs/plan/data-dyna-agent-runtime-integration_WORKSET.md`
  - `src/agent/agent-sidecar.ts`
  - `src/agent/prepared-attempt.ts`
  - `src/agent/result-boundary.ts`
  - `src/agent/observability.ts`
  - `scripts/probe-agent-runtime-observability.ts`
  - `docs/agent/agent-runtime-deletion-audit.md`
  - `docs/agent/agent-runtime-observability-runbook.md`
- terminal: `true`