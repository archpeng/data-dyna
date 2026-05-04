# data-dyna Agent Runtime Integration Workset

## Stage Order

- [ ] `DD-P6-S1` Agent runtime contract and provider-mode decision
- [ ] `DD-P6-S2` prepared context attempt and worker-freshness readers
- [ ] `DD-P6-S3` runtime adapter and provider fail-closed policy
- [ ] `DD-P6-S4` runtime tool-policy enforcement and audit
- [ ] `DD-P6-S5` validator and merchant-review gate integration
- [ ] `DD-P6-S6` Agent observability, failure/cost audit, and runbook
- [ ] `DD-P6-CLOSEOUT-S1` P6 closeout audit

## Active Stage

### `DD-P6-S1`

- Owner: `execute-plan`
- State: `READY`
- Priority: `critical`

目标：

- Define the concrete P6 runtime contract, prepared context attempt, provider/runtime mode decision, and fail-closed boundaries before implementation expands the Agent path.

必须交付：

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

## Slice Ownership

### `DD-P6-S1`

- Allowed repo surfaces:
  - `docs/agent/**` or the smallest equivalent P6 runtime contract document.
  - `src/agent/README.md` for a minimal contract link if needed.
  - `docs/plan/*` parser-truth writeback only if needed for planning correction.
- Disallowed surfaces:
  - Provider/runtime implementation before the P6 contract is accepted.
  - Live provider credentials, live LLM calls, Agent sessions against production services, or model auth/profile setup.
  - Direct Core/business mutation tools, raw payload readers, arbitrary SQL, worker mutation tools, or production dashboards/SLOs/incidents.

### `DD-P6-S2`

- Allowed repo surfaces:
  - Minimal prepared context attempt schema/repository or local/test equivalent.
  - Read-only context-preparation interfaces under `src/agent/**` or app-layer adapter seams if persistence is required.
  - Tests under `tests/**` proving worker freshness gating and `AgentContextBundle` construction.
- Disallowed surfaces:
  - Provider calls or prompt execution.
  - Arbitrary SQL/raw payload/secret reads.
  - Worker job mutation or Core fact writes.

### `DD-P6-S3`

- Allowed repo surfaces:
  - Runtime adapter selection/config seams under `src/agent/**`.
  - Fixture/local adapter proof and typed Pi/provider boundary code if it can fail closed without real credentials in tests.
  - Tests for success, missing config/auth/model/profile/policy, and provider failure audit.
- Disallowed surfaces:
  - Real network provider calls from default tests.
  - Secret logging or persisted provider credentials.
  - Treating fixture output as production model behavior or merchant approval.

### `DD-P6-S4`

- Allowed repo surfaces:
  - Agent tool descriptor/policy code under `src/agent/**`.
  - Audit record fields for allowed/denied tools and policy version.
  - Tests for allowed/forbidden tools and no adapter invocation after policy denial.
- Disallowed surfaces:
  - Direct mutation tools for facts, workers, menus, prices, coupons, customer messages, evidence promotion, or arbitrary SQL.
  - Policy overrides from free-form Agent/provider output.

### `DD-P6-S5`

- Allowed repo surfaces:
  - Agent validator/review handoff adapters under `src/agent/**` or existing merchant-review/evidence seams.
  - Tests spanning valid draft, invalid draft, forbidden mutation, missing evidence, and bypass attempts.
  - Minimal docs/runbook updates for validator/review gate behavior.
- Disallowed surfaces:
  - Business mutation execution.
  - LLM output as evidence fact or merchant decision.
  - Review submission that implies merchant approval.

### `DD-P6-S6`

- Allowed repo surfaces:
  - Agent observability/audit helpers under `src/agent/**` and existing app observability modules if needed.
  - Local/test probe script for Agent runtime path.
  - Runbook docs under `docs/agent/**`.
- Disallowed surfaces:
  - Production dashboard/paging/SLO/incident implementation as a correctness prerequisite.
  - Secret/raw-payload/customer/payment/provider-key leakage in telemetry.
  - Exactly-once or production cost guarantees without proof.

### `DD-P6-CLOSEOUT-S1`

- Allowed repo surfaces:
  - `docs/plan/*` parser-truth closeout writeback.
  - P6 docs/runbooks only for residual clarification discovered during audit.
- Disallowed surfaces:
  - New Agent runtime implementation during closeout.
  - Marking `PACK_COMPLETE` while non-deferred P6 stages remain unchecked.
  - Hiding production operations or Agent safety residuals.

## Current Technical Consensus

- P6 starts only because P2/P3/P4/P5 packs are terminal with accepted evidence.
- The active concrete pack is `data-dyna-agent-runtime-integration`.
- P6 must consume P5 durable worker outputs through prepared, read-only, worker-fresh context; it must not scan unbounded raw history or rely on chat memory.
- Agent output is draft/hypothesis only and must pass deterministic validator plus merchant-review gates before any business action is considered.
- Existing `src/agent/**` code is a foundation, not a completed P6 runtime; this pack must add concrete proof slice by slice.

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

Escalate as later slices touch runtime, review, evidence, observability, worker freshness, or persistence:

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
| `wave-1` | `DD-P6-S1` contract/provider-mode decision | `execute-plan` -> `execution-reality-audit` | accept -> activate `DD-P6-S2` |
| `wave-2` | `DD-P6-S2` prepared context/freshness readers | `execute-plan` -> `execution-reality-audit` | accept -> activate `DD-P6-S3` |
| `wave-3` | `DD-P6-S3` runtime adapter/provider fail-closed policy | `execute-plan` -> `execution-reality-audit` | accept -> activate `DD-P6-S4` |
| `wave-4` | `DD-P6-S4` runtime tool-policy enforcement/audit | `execute-plan` -> `execution-reality-audit` | accept -> activate `DD-P6-S5` |
| `wave-5` | `DD-P6-S5` validator/merchant-review gate | `execute-plan` -> `execution-reality-audit` | accept -> activate `DD-P6-S6` |
| `wave-6` | `DD-P6-S6` observability/failure/cost/runbook | `execute-plan` -> `execution-reality-audit` | accept -> activate `DD-P6-CLOSEOUT-S1` |
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
- latest_closeout_summary: P5 durable worker foundation closed; P6 Agent runtime integration is now the active concrete successor pack.
- latest_verification:
  - `data-dyna-durable-worker-foundation STATUS/WORKSET are PACK_COMPLETE with done=7 pending=0.`
  - `P5 residuals and P6 successor handoff are preserved in docs/workers/p6-agent-runtime-handoff.md, docs/workers/durable-worker-foundation.md, src/app/workers/README.md, and docs/plan.`
  - `Concrete P6 Agent runtime integration pack is now the active README pack with DD-P6-S1 ready for execute-plan.`
