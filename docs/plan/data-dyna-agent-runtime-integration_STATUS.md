# data-dyna Agent Runtime Integration Status

## Current State

- state: `READY`
- owner: `execute-plan`
- route: `PLAN -> EXEC -> REVIEW -> REPLAN -> CLOSEOUT`
- workstream: `data-dyna-agent-runtime-integration`
- pack_mode: `single-root docs/plan machine-compatible active-pack`
- source_truth: `docs/roadmap/data-dyna-production-readiness-roadmap.md`, completed P2 auth/tenancy pack, completed P3 observability pack, completed P4 external producer integration pack, completed P5 durable worker foundation pack, accepted P6 Agent-runtime handoff packet

## Current Step

- active_step: `DD-P6-S1`
- active_wave: `wave-1`
- mode: `ready_for_execute`
- intended_handoff: `execute-plan`

## Planned Stages

- [ ] `DD-P6-S1` Agent runtime contract and provider-mode decision
- [ ] `DD-P6-S2` prepared context attempt and worker-freshness readers
- [ ] `DD-P6-S3` runtime adapter and provider fail-closed policy
- [ ] `DD-P6-S4` runtime tool-policy enforcement and audit
- [ ] `DD-P6-S5` validator and merchant-review gate integration
- [ ] `DD-P6-S6` Agent observability, failure/cost audit, and runbook
- [ ] `DD-P6-CLOSEOUT-S1` P6 closeout audit

## Immediate Focus

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

## Current Technical Consensus

- P6 starts only because P2 auth/tenancy, P3 observability, P4 external producer integration, and P5 durable worker foundation reached `PACK_COMPLETE` with accepted evidence.
- P5 provides durable, tenant-scoped, worker-fresh handoff surfaces for Agent context preparation; P6 must consume those surfaces through typed read-only capabilities and fail closed on missing/stale/dead-lettered/mismatched freshness.
- Existing Agent code already has `AgentContextBundle`, safe tool descriptors, fixture sidecar execution, draft-only output, and no-direct-mutation tests; P6 must turn this into a controlled runtime integration path rather than broadening authority.
- Agent output remains draft/hypothesis only. Deterministic validator and merchant-review gates remain required before any business action is considered.
- Production dashboards, paging, mature SLOs, incident management, cloud secrets, production deployment hardening, capacity planning, and exactly-once claims remain residual unless a later accepted pack owns them.

## Expected Validation Ladder

Always run after parser-truth edits:

```bash
npm run check:plan
git diff --check
```

For `DD-P6-S1` contract/provider-mode docs:

```bash
npm run test:agent
npm run check:plan
git diff --check
```

Escalate as P6 adds prepared-context persistence, runtime adapters, policy enforcement, validator/review integration, or observability:

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

- None currently known for `DD-P6-S1` execution.
- Live provider credentials, production Agent deployment, cloud secrets, production dashboards/SLOs/paging/incidents, and mature model operations are not prerequisites for S1 and remain residual unless a later P6 slice explicitly accepts them.

## Residuals / Notes

- Agent must not receive arbitrary SQL, raw payload reads, secret reads, worker mutation tools, Core writes, direct business mutations, or direct evidence fact promotion.
- P6 should prefer local/test proof with fixture or fail-closed provider boundaries; any real provider integration must keep credentials out of tests/logs and preserve audit evidence.
- Production operations remain residual unless an accepted slice explicitly implements and validates them.

## Master Writeback Evidence

- `data-dyna-durable-worker-foundation` reached `PACK_COMPLETE` with accepted closeout evidence.
- P5 evidence covers PostgreSQL worker jobs/attempts/checkpoints/dead letters, app-layer repository transitions, bounded deterministic executors, checkpoint recovery, idempotent rerun, retry/dead-letter audit, redaction-safe diagnostics, local/test worker observability/probe/runbook, and P6 handoff residuals.
- Master tracker writeback marks `DD-PR-MASTER-P5` done and activates `DD-PR-MASTER-P6`; this pack is the concrete P6 Agent runtime integration queue.

## Machine State

- active_step: `DD-P6-S1`
- latest_completed_step: `DD-PR-MASTER-P5`
- intended_handoff: `execute-plan`
- active_concrete_pack: `data-dyna-agent-runtime-integration`
- latest_plan_summary: Marked P5 master stage done and activated P6 Agent runtime integration as the next concrete pack.
- latest_verification:
  - `data-dyna-durable-worker-foundation STATUS/WORKSET are PACK_COMPLETE with done=7 pending=0.`
  - `P5 residuals and P6 successor handoff are preserved in docs/workers/p6-agent-runtime-handoff.md, docs/workers/durable-worker-foundation.md, src/app/workers/README.md, and docs/plan.`
  - `Concrete P6 Agent runtime integration pack is now the active README pack with DD-P6-S1 ready for execute-plan.`
