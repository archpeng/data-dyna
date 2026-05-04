# data-dyna Agent Runtime Integration Status

## Current State

- state: `READY`
- owner: `execute-plan`
- route: `PLAN -> EXEC -> REVIEW -> REPLAN -> CLOSEOUT`
- workstream: `data-dyna-agent-runtime-integration`
- pack_mode: `single-root docs/plan machine-compatible active-pack`
- source_truth: `docs/roadmap/data-dyna-production-readiness-roadmap.md`, completed P2 auth/tenancy pack, completed P3 observability pack, completed P4 external producer integration pack, completed P5 durable worker foundation pack, accepted P6 Agent-runtime handoff packet, OpenClaw Pi/harness boundary references

## Current Step

- active_step: `DD-P6-S1`
- active_wave: `wave-1`
- mode: `ready_for_execute`
- intended_handoff: `execute-plan`

## Planned Stages

- [ ] `DD-P6-S1` boundary-manager contract and no-fallback runtime decision
- [ ] `DD-P6-S2` prepared attempt seed and read-only tool surface
- [ ] `DD-P6-S3` single Agent harness and LLM-owned turn loop
- [ ] `DD-P6-S4` runtime tool-boundary enforcement and audit
- [ ] `DD-P6-S5` result boundary, validator, and merchant-review gate
- [ ] `DD-P6-S6` Agent observability, deletion proof, and runbook
- [ ] `DD-P6-CLOSEOUT-S1` P6 closeout audit

## Immediate Focus

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

For `DD-P6-S1` contract/boundary-manager docs:

```bash
npm run test:agent
npm run check:plan
git diff --check
```

Escalate as P6 adds prepared attempts, runtime harness, policy enforcement, validator/review gates, observability, or deletion proof:

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
- P6 should choose one clean runtime/harness architecture. If a feature is not needed for that architecture, delete it instead of wrapping it for compatibility.
- Local/test doubles are allowed only as tests around the selected boundary; they must not become production fallback paths.
- Production operations remain residual unless an accepted slice explicitly implements and validates them.

## Master Writeback Evidence

- `data-dyna-durable-worker-foundation` reached `PACK_COMPLETE` with accepted closeout evidence.
- P5 evidence covers PostgreSQL worker jobs/attempts/checkpoints/dead letters, app-layer repository transitions, bounded deterministic executors, checkpoint recovery, idempotent rerun, retry/dead-letter audit, redaction-safe diagnostics, local/test worker observability/probe/runbook, and P6 handoff residuals.
- Master tracker writeback marks `DD-PR-MASTER-P5` done and activates `DD-PR-MASTER-P6`; this pack is the concrete P6 Agent runtime integration queue.
- P6 replan hardened the pack around boundary management, LLM-owned flow, and no compatibility/fallback/dead-code preservation.

## Machine State

- active_step: `DD-P6-S1`
- latest_completed_step: `DD-PR-MASTER-P5`
- intended_handoff: `execute-plan`
- active_concrete_pack: `data-dyna-agent-runtime-integration`
- latest_plan_summary: Reworked P6 plan around OpenClaw-like boundary management, LLM-owned flow, and hard no-compatibility/no-fallback deletion rules.
- latest_verification:
  - `data-dyna-durable-worker-foundation STATUS/WORKSET are PACK_COMPLETE with done=7 pending=0.`
  - `P5 residuals and P6 successor handoff are preserved in docs/workers/p6-agent-runtime-handoff.md, docs/workers/durable-worker-foundation.md, src/app/workers/README.md, and docs/plan.`
  - `Concrete P6 Agent runtime integration pack is active with DD-P6-S1 ready for execute-plan.`
  - `P6 plan/workset hard requirements now prohibit compatibility code, architecture-iteration fallback, fixture/provider/model/runtime fallback, old aliases, and server-owned business-flow orchestration.`
