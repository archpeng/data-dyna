# data-dyna Agent Runtime Integration Plan

## Purpose

Create the concrete P6 Agent runtime integration pack after P5 durable worker foundation reached `PACK_COMPLETE`.

P6 connects Data Dyna's deterministic facts, durable worker freshness, Agent context bundles, runtime adapter, validator gate, and merchant-review handoff into an auditable Agent draft pipeline. It must keep Agent output as draft/hypothesis only, never as Core fact, evidence fact, direct business mutation, or merchant decision.

P6 starts from the accepted P5 handoff: bounded worker outputs, committed freshness refs, dead-letter status, read-only context capabilities, forbidden mutation surfaces, and fail-closed policy. It must not bypass P2 auth/tenancy, P3 observability/redaction, P4 producer evidence, or P5 durable worker audit.

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

Existing Agent code provides context-bundle schemas, safe tool descriptors, a fixture sidecar adapter, Agent run audit objects, draft-only output contracts, and tests proving no direct Core/business mutation. P6 must turn those foundations into a controlled runtime integration path that consumes only prepared, worker-fresh context.

## Scope

In scope:

1. Define the P6 runtime contract, runtime mode decision, prepared context attempt, provider fail-closed policy, and residual boundaries.
2. Implement read-only prepared context construction from committed worker freshness and deterministic summaries without raw payload, arbitrary SQL, secret, or mutation access.
3. Integrate a bounded runtime adapter surface for fixture/local proof and Pi/provider boundary enforcement, with fail-closed behavior when provider config, auth, model, profile, or policy is missing.
4. Enforce runtime tool allowlists and audit tool decisions before any adapter invocation.
5. Preserve deterministic validator and merchant-review gates so Agent output remains draft/hypothesis until explicitly validated and reviewed.
6. Add local/test observability, failure/cost/latency audit, probe/runbook evidence, and no-direct-mutation tests for the Agent runtime path.

Out of scope:

1. Direct writes to Core fact tables, worker job mutation, raw event rewriting, evidence fact promotion from LLM output, or business mutation execution.
2. Arbitrary SQL, raw payload reads, secret reads, provider key logging, or exposing worker enqueue/claim/checkpoint/retry/dead-letter tools to Agent runtime.
3. Production dashboarding, paging, mature SLOs, incident-management process, cloud secrets rollout, production deployment hardening, and capacity planning.
4. Exactly-once claims, production model-routing policy beyond the accepted P6 adapter/config proof, or broad multi-agent orchestration unless a later pack owns it.
5. Expanding non-POS producer integration beyond accepted P4 residuals.

## P6 Stage Definitions

#### `DD-P6-S1` — Agent runtime contract and provider-mode decision

- Owner: `execute-plan`
- State: `READY`
- Priority: `critical`

目标：

- Define the concrete P6 runtime contract, prepared context attempt, provider/runtime mode decision, and fail-closed boundaries before implementation expands the Agent path.

交付物：

1. A P6 runtime contract document defines runtime modes, prepared context attempt shape, Agent run lifecycle, context freshness requirements, provider config boundaries, tool-policy gate, validator/merchant-review gate, audit fields, and residuals.
2. The contract maps accepted P5 handoff capabilities into P6 read-only context preparation without arbitrary SQL, raw payload, secret, worker mutation, Core write, or business mutation authority.
3. The contract chooses a local/test validation strategy for fixture/Pi-provider boundaries and states what production provider/secrets/ops work remains residual if not testable locally.
4. Parser truth remains aligned on this P6 pack and active slice.

done_when:

1. P6 runtime mode and provider-boundary decision is documented with fail-closed behavior for missing or ambiguous provider/model/profile/auth/tool policy.
2. Prepared context attempt, worker freshness refs, context budget, allowed read capabilities, forbidden capabilities, and audit lifecycle are documented as the only path to Agent invocation.
3. No live provider credential, live LLM call, direct Core write, direct business mutation, raw payload read, arbitrary SQL, or secret-read claim is introduced.
4. `npm run test:agent`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if P6 requires live provider credentials, cloud deployment, production dashboarding, paging, or incident process before the contract can be accepted.
2. Stop if the runtime contract allows Agent output to become fact, evidence, merchant decision, or business action without deterministic validator and merchant-review gates.
3. Stop if the contract grants arbitrary SQL, raw payload, secret, worker mutation, Core write, or business mutation authority.
4. Stop if parser truth drifts from the active P6 pack or active slice.

必须避免：

1. Do not implement provider/runtime code before the P6 contract is accepted.
2. Do not use the P5 handoff document to skip concrete P6 proof.

#### `DD-P6-S2` — prepared context attempt and worker-freshness readers

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `critical`

目标：

- Build the read-only prepared context path from committed worker freshness to `AgentContextBundle` without exposing unsafe data or mutation tools.

交付物：

1. Prepared context attempt schema/repository or accepted local/test equivalent records worker freshness refs, context bundle version, context hash, allowed capabilities, forbidden capabilities, status, and failure reasons.
2. Read-only context preparation consumes projection/snapshot/benchmark/evidence freshness and safe summaries through typed interfaces, not arbitrary SQL or raw payload reads.
3. Tests prove missing/stale/dead-lettered/tenant-mismatched/over-budget worker freshness fails closed and successful preparation builds an `agent-context-bundle.v1` with deterministic evidence refs.

done_when:

1. A prepared context attempt can be created, blocked, or marked prepared with auditable worker freshness refs and no mutation side effects.
2. Agent context construction uses only committed worker outputs and existing `AgentContextBundle` validation.
3. Tests prove fail-closed behavior for missing freshness, dead letters, tenant/source mismatch, forbidden raw data, and context budget overflow.
4. `npm run test:agent`, `npm run test:app:workers`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if context preparation scans unbounded raw event history, reads raw payloads/secrets, or exposes peer-store identity.
2. Stop if prepared attempts can proceed without committed worker freshness refs.
3. Stop if tenant/store/opportunity scope can be supplied by free-form Agent input rather than accepted deterministic identity.
4. Stop if this slice starts provider calls before prepared context proof is accepted.

必须避免：

1. Do not add Agent write access to worker job state or Core fact tables.
2. Do not hide stale/dead-lettered worker outputs behind best-effort context preparation.

#### `DD-P6-S3` — runtime adapter and provider fail-closed policy

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `high`

目标：

- Integrate the Agent runtime adapter boundary so local/test execution is auditable and provider/Pi configuration fails closed when unsafe or unavailable.

交付物：

1. Runtime adapter selection validates runtime mode, provider, model, profile/thinking level, prompt ref, context hash, and policy version before invocation.
2. Fixture/local adapter proof remains deterministic; Pi/provider adapter boundary is typed and fail-closed without requiring real credentials in tests unless explicit safe test credentials are available.
3. Tests prove missing provider config/auth/model/profile/tool policy blocks invocation, successful fixture execution captures draft-only output, and adapter failures are audited.

done_when:

1. Agent runtime invocation cannot occur without a prepared context attempt, accepted tool policy, provider/runtime config, prompt ref, and audit store.
2. Fixture/local proof produces `truthStatus = agent_draft_not_core_truth` with `requestedCoreWrites = []` and evidence refs copied from deterministic context.
3. Provider/Pi unavailable or misconfigured paths fail closed with safe audit evidence and no secret leakage.
4. `npm run test:agent`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if live provider calls are made from tests without explicit safe credentials and policy proof.
2. Stop if provider secrets, prompts with sensitive payloads, or model auth values are logged or persisted unsafely.
3. Stop if adapter output can request Core/business mutations or bypass draft-only validation.
4. Stop if provider failure loses audit evidence or is treated as a successful draft.

必须避免：

1. Do not make production provider availability a prerequisite for local/test acceptance.
2. Do not treat fixture output as merchant-approved or production model behavior.

#### `DD-P6-S4` — runtime tool-policy enforcement and audit

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `high`

目标：

- Enforce a default-deny runtime tool allowlist and audit all allowed/denied tool decisions before Agent invocation.

交付物：

1. Tool descriptors and runtime policy evaluation reject arbitrary SQL, raw payload, secret, worker mutation, Core write, direct business mutation, and unknown tool surfaces.
2. Agent runtime stores policy version, allowed tools, denied tools/reasons, and mutation policy in audit records.
3. Tests prove forbidden tools fail closed and accepted tools remain read/draft/validate/submit-review only with `no_core_or_business_mutation`.

done_when:

1. Runtime adapter invocation is impossible unless tool policy evaluation passes.
2. Forbidden tools are denied with auditable reasons and no adapter invocation side effect.
3. Safe tools remain bounded to read context, draft, validate, and submit-for-review semantics.
4. `npm run test:agent`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if any direct mutation tool can pass policy evaluation.
2. Stop if denied tool decisions are only logged in prose and not testable/auditable.
3. Stop if tool policy can be overridden by free-form Agent or provider output.
4. Stop if policy enforcement depends on production dashboarding or incident tooling.

必须避免：

1. Do not broaden the tool allowlist because a draft seems useful.
2. Do not expose worker mutation tools to Agent runtime.

#### `DD-P6-S5` — validator and merchant-review gate integration

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `high`

目标：

- Wire Agent draft output through deterministic validation and merchant-review handoff while preserving no-direct-mutation authority.

交付物：

1. Agent draft outputs are validated against deterministic experiment-plan rules before merchant-review submission is allowed.
2. Merchant-review handoff receives draft/hypothesis payloads and evidence refs only; no business mutation is executed.
3. Tests prove invalid drafts fail closed, valid drafts can be submitted for review, LLM output is not evidence fact, and Core/business mutation targets remain forbidden.

done_when:

1. Agent output remains `agent_draft_not_core_truth` until deterministic validator and merchant-review states accept it.
2. Merchant-review submission path is auditable and does not mutate menus, prices, coupons, customer messages, facts, benchmarks, or evidence facts.
3. Tests cover valid, invalid, forbidden-mutation, missing-evidence, and bypass attempts.
4. `npm run test:agent`, `npm run test:review`, `npm run test:evidence`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if Agent draft can skip deterministic validation or merchant review.
2. Stop if LLM/provider output is inserted as fact or evidence.
3. Stop if review submission executes a business mutation or implies merchant approval.
4. Stop if validation requires production services not available in local/test proof.

必须避免：

1. Do not treat draft generation as experiment execution.
2. Do not let Agent output repair or rewrite deterministic Core data.

#### `DD-P6-S6` — Agent observability, failure/cost audit, and runbook

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `medium`

目标：

- Add local/test observability, safe audit, cost/latency/failure fields, probe, and operator runbook for the controlled Agent runtime path.

交付物：

1. Agent runtime logs/metrics/audit records cover prepared context, policy evaluation, adapter invocation, draft capture, validator outcome, review handoff, provider failure, latency, and cost metadata when available.
2. Probe/runbook documents local/test execution, safe query shapes, failure triage, replay/retry boundaries, provider secret handling, and production-ops residuals.
3. Tests/probes prove telemetry is redaction-safe and does not leak provider keys, bearer tokens, raw payloads, customer/payment identifiers, prompts with secrets, or merchant-sensitive details.

done_when:

1. Local/test Agent runtime probe demonstrates success, blocked policy, provider failure, validator rejection, and review handoff evidence without production infrastructure.
2. Observability/audit fields are bounded and redaction-safe.
3. Runbook preserves production dashboard/SLO/paging/incident and cloud-secret/deployment hardening as residuals unless implemented by a later pack.
4. `npm run test:agent`, `npm run test:review`, `npm run probe:observability`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if telemetry exposes secrets, raw payloads, payment/customer identifiers, provider keys, or merchant-sensitive details.
2. Stop if provider failure or policy denial lacks audit evidence.
3. Stop if production dashboards/SLOs/incidents become required for local/test correctness rather than residual operations maturity.
4. Stop if exactly-once or production cost guarantees are claimed without implementation proof.

必须避免：

1. Do not make dashboard polish a blocker for minimal runtime safety.
2. Do not hide provider cost/failure uncertainty in successful draft metrics.

#### `DD-P6-CLOSEOUT-S1` — P6 closeout audit

- Owner: `execution-reality-audit`
- State: `QUEUED`
- Priority: `medium`

目标：

- Audit Agent runtime evidence, preserve residuals, and terminalize this pack only if P6 runtime safety and no-direct-mutation evidence are accepted.

交付物：

1. Reality audit over runtime contract, prepared context, provider adapter/fail-closed behavior, tool policy, validator/merchant-review gate, observability/probe/runbook, and residuals.
2. Parser-truth writeback to `PACK_COMPLETE` only if all non-deferred P6 slices are accepted.
3. Master tracker update recommendation for `DD-PR-MASTER-P6` and production-readiness master closeout.
4. Residual handoff for production dashboards, paging, mature SLOs, incident management, cloud secrets, deployment hardening, capacity planning, production model operations, and any accepted Agent limitations.

done_when:

1. README/PLAN/STATUS/WORKSET agree on `PACK_COMPLETE` for the P6 pack or explicitly activate the production-readiness master closeout.
2. Agent runtime evidence exists for prepared context, provider fail-closed behavior, tool-policy enforcement, draft-only output, validator/merchant-review gate, audit, and no direct mutation authority.
3. P6 evidence does not claim Agent output as fact/evidence/merchant decision/business action.
4. Required validation gates for all accepted P6 slices pass, including `npm run test:agent`, `npm run test:review`, `npm run test:evidence`, `npm run probe:observability`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, `git diff --check`, and `plan_sync docs/plan` where applicable.
5. Production dashboard/SLO/incident/cloud hardening residuals are preserved unless separately implemented and accepted.

stop_boundary:

1. Stop if any accepted P6 slice lacks proof and cannot be audited.
2. Stop if Agent can write Core facts, mutate business state, bypass validator, bypass merchant review, or promote LLM output to evidence.
3. Stop if provider failures, costs, prompts, tool decisions, or run lifecycle are unauditable.
4. Stop if parser truth would mark `PACK_COMPLETE` while any non-deferred P6 stage remains unchecked.

必须避免：

1. Do not terminalize P6 from contract docs alone if runtime/tool/gate proof is required and missing.
2. Do not hide production provider, dashboard, SLO, incident, cloud, or unresolved Agent residuals.

## Autopilot Transition Contract

- `master_plan/completed` or planning writeback for this pack activates `DD-P6-S1` and routes to `execute-plan`.
- `wave_plan/completed` -> `execute` same active slice when extra wave planning is used.
- `execute/completed` -> `review` same slice; execution completion is not terminal.
- `review/completed` + accepted evidence -> write back README/STATUS/WORKSET, mark the reviewed slice done, activate the next unchecked `Stage Order` item, and route to next `wave_plan` or `execute`.
- `review/continue` -> keep the same active slice and route to `execute` for residual in-scope work.
- `needs_replan` -> `replan` with `plan-creator`.
- `blocked` / `failed` -> stop and preserve blocker evidence in STATUS.
- `closeout` is forbidden unless README and WORKSET parse as active slice `PACK_COMPLETE`, owner `closeout`, state `DONE`, and no non-deferred stages remain.
