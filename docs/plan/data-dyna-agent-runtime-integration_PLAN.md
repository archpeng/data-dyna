# data-dyna Agent Runtime Integration Plan

## Purpose

Create the concrete P6 Agent runtime integration pack after P5 durable worker foundation reached `PACK_COMPLETE`.

P6 is **not** a business-flow orchestrator. P6 creates an OpenClaw-like Agent runtime boundary: Data Dyna prepares a safe attempt, exposes only bounded read/draft/validate/review tools, enforces policy at runtime, records audit evidence, and then lets the LLM own the query/reason/draft sequence inside that boundary.

The system owns boundaries: tenant identity, worker freshness, context budget, tool allowlist, provider/runtime selection, session audit, result schema, deterministic validator, merchant-review gate, redaction, and fail-closed behavior. The LLM owns flow: which allowed read tools to call, in what order, how to reason over returned evidence, and when to produce a draft artifact for validation.

P6 starts from the accepted P5 handoff: bounded worker outputs, committed freshness refs, dead-letter status, read-only context capabilities, forbidden mutation surfaces, and fail-closed policy. It must not bypass P2 auth/tenancy, P3 observability/redaction, P4 producer evidence, or P5 durable worker audit.

## Hard Requirements

1. No compatibility code: do not preserve legacy Agent paths, duplicate adapters, old runtime aliases, or transitional abstractions once a P6 boundary-manager replacement owns the behavior.
2. No architecture-iteration fallback: a selected runtime/harness/provider/model/profile either passes policy or fails closed; do not silently fall back to fixture mode, older adapters, alternate providers, alternate models, relaxed policies, or static draft generation.
3. Delete unnecessary code instead of wrapping it. If `adapter.draft(...)`, fixture sidecar behavior, allowed-operation lists, or deterministic flow-management helpers become obsolete, remove or replace them in the owning slice rather than keeping them for compatibility.
4. Do not implement a server-side business workflow manager. The runtime must prepare boundaries and tools, then hand the turn to the LLM/harness. Validation and merchant review are result gates, not a hidden system-managed reasoning flow.
5. Do not expose arbitrary SQL, raw payload reads, secret reads, worker mutation tools, Core writes, direct business mutations, or evidence promotion to the Agent.

## Explicit Risk Guardrails

1. **No `adapter.draft(context)` runtime shape**: production Agent runtime must become a `runAgentAttempt({ preparedAttempt, prompt, tools, policy, runtime, audit })`-style boundary that hands a tool-governed turn to the LLM/harness. `adapter.draft(...)`, fixture-only runtime paths, and static draft functions are obsolete once the selected harness owns behavior.
2. **No hidden server-managed business flow**: server code must not hardcode `read summary -> draft -> validate -> submit` or any equivalent reasoning pipeline. The LLM chooses allowed read tools and draft timing; the server enforces boundaries, result schemas, deterministic validator, and merchant-review gates.
3. **No template-only over-constraint**: prepared attempts must provide a bounded context seed/index plus read-only tools, not a full server-selected reasoning transcript. The LLM must be able to inspect allowed summaries through tools inside policy, while raw history, secrets, stale/dead-lettered freshness, and mutation surfaces remain blocked.
4. **Risk closure is slice-owned**: `DD-P6-S1` names the guardrails in contract, `DD-P6-S2` proves context seed/read-only tools, `DD-P6-S3` replaces draft-function runtime with one harness, `DD-P6-S4` enforces per-call tool boundaries, `DD-P6-S5` blocks automatic submit/pipeline bypass, and `DD-P6-S6` provides deletion proof.

## Source Truth

- `docs/roadmap/data-dyna-production-readiness-roadmap.md`
- `docs/plan/data-dyna-production-readiness-master_PLAN.md`
- `docs/plan/data-dyna-production-readiness-master_STATUS.md`
- `docs/plan/data-dyna-production-readiness-master_WORKSET.md`
- `docs/plan/data-dyna-durable-worker-foundation_STATUS.md`
- `docs/plan/data-dyna-durable-worker-foundation_WORKSET.md`
- `docs/workers/p6-agent-runtime-handoff.md`
- `docs/workers/durable-worker-foundation.md`
- `src/agent/README.md`
- `src/agent/context-bundle.ts`
- `src/agent/agent-tools.ts`
- `src/agent/agent-sidecar.ts`
- `src/app/workers/README.md`
- `src/app/workers/worker-contract.ts`
- OpenClaw reference: `/home/peng/dt-git/github/openclaw/docs/pi.md`
- OpenClaw reference: `/home/peng/dt-git/github/openclaw/docs/plugins/sdk-agent-harness.md`
- OpenClaw reference: `/home/peng/dt-git/github/openclaw/docs/plan/codex-context-engine-harness.md`
- `tests/agent-dd-p3-s1.spec.ts`
- `tests/agent-dd-p3-s2.spec.ts`
- `tests/agent-worker-handoff-s6.spec.ts`
- `tests/merchant-review-dd-p4-s1.spec.ts`
- `tests/evidence-dd-p5-s1.spec.ts`

## Current Baseline

P2 is complete: `/events` requires bearer ingestion credentials, tenant-safe event writes are enforced, tenant-scoped idempotency exists, and unauthorized requests have no persistence side effects.

P3 is complete: runtime logs/metrics/probes are redaction-safe and cover request/event outcomes with local/test validation.

P4 is complete for the POS `pos.order_paid` pilot producer path: producer contract, mapper, authenticated `/events` delivery, non-blocking producer failure, replay/backfill, and residuals are accepted.

P5 is complete: PostgreSQL-backed durable worker jobs/checkpoints/dead letters, repository seams, bounded executors, idempotent rerun proof, checkpoint recovery, retry/dead-letter classification, safe diagnostics, worker observability/probe/runbook, and P6 handoff are accepted.

Existing Agent code provides context-bundle schemas, safe tool descriptors, a fixture sidecar adapter, Agent run audit objects, draft-only output contracts, and tests proving no direct Core/business mutation. Treat these as raw material, not compatibility surfaces. P6 must replace any flow-manager-shaped or fixture-only path with a single boundary-manager runtime model, and delete obsolete code when the owning slice supersedes it.

## Scope

In scope:

1. Define the P6 boundary-manager contract: prepared attempt, runtime/harness selection, tool catalog, policy gates, LLM-owned turn loop, result gates, audit fields, and residual boundaries.
2. Implement prepared context as a seed/index with worker freshness refs and bounded read-only tools, not as a full server-selected reasoning transcript.
3. Integrate one selected runtime/harness path that hands an Agent turn to the LLM with prompt, tools, policy, context seed, and audit callbacks; no fixture/legacy/alternate runtime fallback remains in production code.
4. Enforce runtime tool policy before tool registration, before each tool call, and before tool result return to the model.
5. Preserve deterministic validator and merchant-review gates as result boundaries: Agent output remains draft/hypothesis until validated and reviewed.
6. Add local/test observability, failure/cost/latency audit, probe/runbook evidence, and deletion proof for removed compatibility/flow-manager code.

Out of scope:

1. Direct writes to Core fact tables, worker job mutation, raw event rewriting, evidence fact promotion from LLM output, or business mutation execution.
2. Arbitrary SQL, raw payload reads, secret reads, provider key logging, or exposing worker enqueue/claim/checkpoint/retry/dead-letter tools to Agent runtime.
3. Compatibility shims, old runtime aliases, model/provider fallback, fixture fallback, dual stack runtime paths, or transitional abstractions kept only to preserve old behavior.
4. Server-owned business flow orchestration that forces a fixed query -> draft -> validate -> submit sequence instead of letting the LLM use allowed tools inside boundaries.
5. Production dashboarding, paging, mature SLOs, incident-management process, cloud secrets rollout, production deployment hardening, and capacity planning.
6. Exactly-once claims, broad multi-agent orchestration, or expanding non-POS producer integration beyond accepted P4 residuals.

## P6 Stage Definitions

#### `DD-P6-S1` — boundary-manager contract and no-fallback runtime decision

- Owner: `execution-reality-audit`
- State: `DONE`
- Priority: `critical`

目标：

- Define the concrete P6 Agent boundary-manager contract, OpenClaw-like LLM-owned turn model, selected runtime/harness path, and hard no-compatibility/no-fallback deletion policy before implementation expands the Agent path.

交付物：

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

#### `DD-P6-S2` — prepared attempt seed and read-only tool surface

- Owner: `execute-plan`
- State: `READY`
- Priority: `critical`

目标：

- Build the prepared Agent attempt as a safe context seed plus read-only tool boundary, allowing the LLM to decide what to inspect while preventing unsafe data or mutation access.

交付物：

1. Prepared attempt schema/repository or accepted local/test equivalent records worker freshness refs, context seed hash, context budget, tool catalog version, forbidden capabilities, status, and failure reasons.
2. Read-only tools expose projection/snapshot/benchmark/evidence/dead-letter summaries through typed interfaces scoped by committed freshness refs; no arbitrary SQL, raw payload, secret, peer-store identity, or worker mutation access exists.
3. Tests prove missing/stale/dead-lettered/tenant-mismatched/over-budget worker freshness fails closed and successful preparation creates a bounded seed/index for the LLM-owned turn.
4. Obsolete static context-packing or allowed-operation code is removed when replaced by the prepared-attempt/tool-catalog boundary.

done_when:

1. A prepared attempt can be created, blocked, or marked prepared with auditable worker freshness refs and no mutation side effects.
2. Agent context seed construction uses only committed worker outputs and points to read-only tools for additional LLM-selected inspection.
3. Tests prove fail-closed behavior for missing freshness, dead letters, tenant/source mismatch, forbidden raw data, and context budget overflow.
4. Replaced compatibility/static-flow code is deleted rather than kept as an alternate path.
5. `npm run test:agent`, `npm run test:app:workers`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if context preparation scans unbounded raw event history, reads raw payloads/secrets, exposes peer-store identity, or performs worker/Core mutations.
2. Stop if prepared attempts can proceed without committed worker freshness refs.
3. Stop if tenant/store/opportunity scope can be supplied by free-form Agent input rather than accepted deterministic identity.
4. Stop if this slice starts provider calls before prepared attempt/tool-boundary proof is accepted.
5. Stop if obsolete static-flow/compatibility code remains reachable after replacement.

必须避免：

1. Do not add Agent write access to worker job state or Core fact tables.
2. Do not hide stale/dead-lettered worker outputs behind best-effort context preparation.
3. Do not preselect the full reasoning path for the LLM.

#### `DD-P6-S3` — single Agent harness and LLM-owned turn loop

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `high`

目标：

- Replace the draft-function adapter shape with one selected OpenClaw-like Agent harness path that runs a prepared LLM turn under Data Dyna boundaries and has no runtime/provider/model fallback.

交付物：

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

#### `DD-P6-S4` — runtime tool-boundary enforcement and audit

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `high`

目标：

- Enforce default-deny tool boundaries before registration, before each call, and before tool results return to the LLM, while preserving LLM-owned flow inside the allowed tool catalog.

交付物：

1. Tool descriptors and runtime policy reject arbitrary SQL, raw payload, secret, worker mutation, Core write, direct business mutation, evidence promotion, unknown tools, and any compatibility/fallback tool surfaces.
2. Runtime audit records policy version, allowed tools, denied tools/reasons, tool-call attempts, sanitized tool results, and mutation policy.
3. Tests prove forbidden tools fail closed with no adapter/harness side effect, accepted tools remain read/draft/validate/submit-review only, and provider/model output cannot override policy.
4. Obsolete tool aliases or compatibility names are removed instead of mapped to new tools.

done_when:

1. Runtime harness invocation is impossible unless tool policy evaluation passes.
2. Every tool call is checked at runtime, and forbidden tools are denied with auditable reasons before execution.
3. Tool results are bounded and redaction-safe before returning to the LLM.
4. Safe tools preserve LLM-owned flow while remaining bounded to read context, draft artifact creation, deterministic validation, and review submission request semantics.
5. `npm run test:agent`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if any direct mutation, arbitrary SQL, raw payload, secret, worker mutation, evidence promotion, compatibility alias, or fallback tool can pass policy evaluation.
2. Stop if denied tool decisions are only logged in prose and not testable/auditable.
3. Stop if tool policy can be overridden by free-form Agent/provider output.
4. Stop if policy enforcement depends on production dashboarding or incident tooling.

必须避免：

1. Do not broaden the tool allowlist because a draft seems useful.
2. Do not expose worker mutation tools to Agent runtime.
3. Do not preserve old tool names as aliases for compatibility.

#### `DD-P6-S5` — result boundary, validator, and merchant-review gate

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `high`

目标：

- Treat LLM output as an untrusted draft artifact, then enforce deterministic validation and merchant-review gates without turning the server into a business-flow orchestrator.

交付物：

1. LLM-produced draft artifacts are parsed and validated against deterministic schemas and experiment-plan rules before any merchant-review submission request is allowed.
2. Merchant-review handoff receives draft/hypothesis payloads and evidence refs only; no business mutation is executed and no merchant approval is implied.
3. Tests prove invalid drafts fail closed, valid drafts can request review submission, LLM output is not evidence fact, Core/business mutation targets remain forbidden, and the LLM cannot bypass result gates.
4. Any old automatic draft -> validate -> submit pipeline code is removed if it bypasses the LLM-owned turn or hides result-gate decisions.

done_when:

1. Agent output remains `agent_draft_not_core_truth` until deterministic validator and merchant-review states accept it.
2. Merchant-review submission path is auditable and does not mutate menus, prices, coupons, customer messages, facts, benchmarks, or evidence facts.
3. Tests cover valid draft, invalid draft, forbidden mutation, missing evidence, bypass attempts, and no automatic submit without accepted result gates.
4. Replaced pipeline/compatibility code is deleted rather than kept as an alternate path.
5. `npm run test:agent`, `npm run test:review`, `npm run test:evidence`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if Agent draft can skip deterministic validation or merchant review.
2. Stop if LLM/provider output is inserted as fact or evidence.
3. Stop if review submission executes a business mutation or implies merchant approval.
4. Stop if validation requires production services not available in local/test proof.
5. Stop if server-managed pipeline code remains reachable after the boundary-gate replacement.

必须避免：

1. Do not treat draft generation as experiment execution.
2. Do not let Agent output repair or rewrite deterministic Core data.
3. Do not auto-submit review as a hidden server-managed workflow step.

#### `DD-P6-S6` — Agent observability, deletion proof, and runbook

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `medium`

目标：

- Add local/test observability, safe audit, cost/latency/failure fields, probe, runbook, and explicit deletion proof for removed compatibility/fallback/flow-manager code.

交付物：

1. Agent runtime logs/metrics/audit records cover prepared attempt, policy evaluation, LLM tool calls, tool denials, sanitized tool results, draft capture, validator outcome, review handoff request, provider/runtime failure, latency, and cost metadata when available.
2. Probe/runbook documents local/test execution, safe query shapes, failure triage, provider secret handling, no-fallback runtime policy, removed compatibility surfaces, and production-ops residuals.
3. Tests/probes prove telemetry is redaction-safe and does not leak provider keys, bearer tokens, raw payloads, customer/payment identifiers, prompts with secrets, or merchant-sensitive details.
4. A deletion audit lists obsolete compatibility/fallback/flow-manager code removed during P6 and proves no deleted behavior remains reachable through aliases or fallback branches.

done_when:

1. Local/test Agent runtime probe demonstrates success, blocked policy, provider/runtime failure, validator rejection, review handoff request, and no-fallback evidence without production infrastructure.
2. Observability/audit fields are bounded and redaction-safe.
3. Runbook preserves production dashboard/SLO/paging/incident and cloud-secret/deployment hardening as residuals unless implemented by a later pack.
4. Deletion audit proves obsolete compatibility/fallback/flow-manager code is removed or explicitly still owned by a queued P6 slice, not silently preserved.
5. `npm run test:agent`, `npm run test:review`, `npm run probe:observability`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if telemetry exposes secrets, raw payloads, payment/customer identifiers, provider keys, or merchant-sensitive details.
2. Stop if provider failure, runtime denial, policy denial, or tool-call denial lacks audit evidence.
3. Stop if production dashboards/SLOs/incidents become required for local/test correctness rather than residual operations maturity.
4. Stop if exactly-once, production cost guarantees, or fallback behavior are claimed without implementation proof.
5. Stop if compatibility/fallback/flow-manager surfaces remain reachable without a later queued slice owning their deletion.

必须避免：

1. Do not make dashboard polish a blocker for minimal runtime safety.
2. Do not hide provider cost/failure uncertainty in successful draft metrics.
3. Do not document fallback as an operator option.

#### `DD-P6-CLOSEOUT-S1` — P6 closeout audit

- Owner: `execution-reality-audit`
- State: `QUEUED`
- Priority: `medium`

目标：

- Audit Agent runtime boundary evidence, deletion proof, residuals, and terminalize this pack only if P6 implements boundary management without server-owned business-flow orchestration or fallback compatibility paths.

交付物：

1. Reality audit over boundary-manager contract, prepared attempt/tool surface, single harness, runtime tool policy, result gates, observability/probe/runbook, deletion audit, and residuals.
2. Parser-truth writeback to `PACK_COMPLETE` only if all non-deferred P6 slices are accepted.
3. Master tracker update recommendation for `DD-PR-MASTER-P6` and production-readiness master closeout.
4. Residual handoff for production dashboards, paging, mature SLOs, incident management, cloud secrets, deployment hardening, capacity planning, production model operations, and any accepted Agent limitations.

done_when:

1. README/PLAN/STATUS/WORKSET agree on `PACK_COMPLETE` for the P6 pack or explicitly activate the production-readiness master closeout.
2. Agent runtime evidence exists for prepared attempt, LLM-owned tool-use flow, selected harness, no-fallback runtime policy, tool-boundary enforcement, draft-only result boundary, validator/merchant-review gate, audit, and no direct mutation authority.
3. P6 evidence proves obsolete compatibility/fallback/flow-manager code was deleted or explicitly remains owned by a non-deferred queued slice before terminalization.
4. P6 evidence does not claim Agent output as fact/evidence/merchant decision/business action.
5. Required validation gates for all accepted P6 slices pass, including `npm run test:agent`, `npm run test:review`, `npm run test:evidence`, `npm run probe:observability`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, `git diff --check`, and `plan_sync docs/plan` where applicable.
6. Production dashboard/SLO/incident/cloud hardening residuals are preserved unless separately implemented and accepted.

stop_boundary:

1. Stop if any accepted P6 slice lacks proof and cannot be audited.
2. Stop if Agent can write Core facts, mutate business state, bypass validator, bypass merchant review, or promote LLM output to evidence.
3. Stop if provider failures, costs, prompts, tool decisions, or run lifecycle are unauditable.
4. Stop if compatibility code, fallback runtime/model/provider branches, fixture fallback, old aliases, or server-owned business-flow orchestration remain reachable.
5. Stop if parser truth would mark `PACK_COMPLETE` while any non-deferred P6 stage remains unchecked.

必须避免：

1. Do not terminalize P6 from contract docs alone if runtime/tool/gate/deletion proof is required and missing.
2. Do not hide production provider, dashboard, SLO, incident, cloud, or unresolved Agent residuals.
3. Do not preserve old behavior behind compatibility switches.

## Autopilot Transition Contract

- `master_plan/completed` or planning writeback for this pack activates `DD-P6-S1` and routes to `execute-plan`.
- `wave_plan/completed` -> `execute` same active slice when extra wave planning is used.
- `execute/completed` -> `review` same slice; execution completion is not terminal.
- `review/completed` + accepted evidence -> write back README/STATUS/WORKSET, mark the reviewed slice done, activate the next unchecked `Stage Order` item, and route to next `wave_plan` or `execute`.
- `review/continue` -> keep the same active slice and route to `execute` for residual in-scope work.
- `needs_replan` -> `replan` with `plan-creator`.
- `blocked` / `failed` -> stop and preserve blocker evidence in STATUS.
- `closeout` is forbidden unless README and WORKSET parse as active slice `PACK_COMPLETE`, owner `closeout`, state `DONE`, and no non-deferred stages remain.
