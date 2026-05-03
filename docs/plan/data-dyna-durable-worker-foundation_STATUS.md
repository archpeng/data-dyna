# data-dyna Durable Worker Foundation Status

## Current State

- state: `READY`
- owner: `execute-plan`
- route: `PLAN -> EXEC -> REVIEW -> REPLAN -> CLOSEOUT`
- workstream: `data-dyna-durable-worker-foundation`
- pack_mode: `single-root docs/plan machine-compatible active-pack`
- source_truth: `docs/roadmap/data-dyna-production-readiness-roadmap.md`, completed P2 auth/tenancy pack, completed P3 observability pack, completed P4 external producer integration pack, current worker contract-only seams, OpenClaw/Pi reference docs for future Agent handoff patterns

## Current Step

- active_step: `DD-P5-S1`
- active_wave: `wave-1`
- mode: `ready_for_execute`
- intended_handoff: `execute-plan`

## Planned Stages

- [ ] `DD-P5-S1` durable worker contract and execution-model decision
- [ ] `DD-P5-S2` durable job schema and repository seam
- [ ] `DD-P5-S3` bounded worker executors and checkpointed deterministic processing
- [ ] `DD-P5-S4` retry, dead-letter, and failure-classification proof
- [ ] `DD-P5-S5` worker observability, probe, and operator runbook
- [ ] `DD-P5-S6` P6 Agent-runtime handoff packet and residual gate
- [ ] `DD-P5-CLOSEOUT-S1` P5 closeout audit

## Immediate Focus

### `DD-P5-S1`

- Owner: `execute-plan`
- State: `READY`
- Priority: `critical`

目标：

- Define the P5 durable worker contract, execution model, OpenClaw/Pi-inspired handoff principles, and residual boundaries before schema or worker implementation.

必须交付：

1. `docs/workers/durable-worker-foundation.md` defines the selected minimal execution model, job lifecycle, checkpoint/watermark contract, retry/dead-letter policy, idempotent-write rules, and worker DAG from raw events to projections/snapshots/benchmarks/evidence.
2. The contract maps current `src/app/workers/**` contract-only seams to future executable worker boundaries without importing runtime clients into deterministic Core.
3. The contract defines a P6 handoff surface: durable worker outputs, freshness metadata, and typed read-only capabilities a future Agent runtime may consume, while leaving Pi/LLM runtime execution residual.
4. The contract explicitly preserves production dashboards, paging, mature SLOs, incident management, cloud hardening, non-POS producers, and P6 Agent runtime as residuals.

done_when:

1. A bounded P5 execution model is selected or the slice stops with explicit reasons why the repo cannot choose one from current truth.
2. Job, attempt, checkpoint, retry, dead-letter, idempotency, observability, and P6 handoff contracts are documented without implementation claims.
3. OpenClaw/Pi lessons are translated into typed worker capabilities, durable run records, bounded context handoff, and fail-closed policy rather than live Agent runtime work.
4. `npm run test:app:workers`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if the worker contract requires a broker, cloud scheduler, production dashboard, paging policy, mature SLO, or incident process as a P5 prerequisite instead of documenting it as residual.
2. Stop if P5 starts P6 Agent runtime, live Pi provider integration, model auth, or LLM execution.
3. Stop if the contract would allow silent data loss, non-idempotent reruns, arbitrary SQL capabilities, or Agent direct mutation of facts.
4. Stop if the selected model bypasses P2 tenant identity, P3 observability, or accepted P4 producer idempotency evidence.

必须避免：

1. Do not implement schema or worker code before the durable contract is accepted.
2. Do not use OpenClaw/Pi inspiration to smuggle P6 runtime into P5.

## Current Technical Consensus

- P5 starts only because P2 auth/tenancy, P3 observability, and P4 external producer integration reached `PACK_COMPLETE` with accepted evidence.
- The selected P4 pilot path is POS `pos.order_paid`; broader producers remain residual and must not be required for the first P5 worker proof.
- Current app worker seams are contract-only and must not be described as durable until P5 provides job/checkpoint/retry/dead-letter evidence.
- P5 should prefer the simplest durable execution model that can be validated locally, likely PostgreSQL-backed job/checkpoint/dead-letter tables unless S1 documents a better bounded choice.
- Durable worker outputs are the prerequisite handoff for P6 Agent runtime; P6 remains residual until worker outputs are durable, tenant-scoped, bounded, and auditable.
- OpenClaw/Pi patterns should influence P5 as typed capabilities, durable run records, bounded context handoff, tool-policy seams, and fail-closed ownership; they must not create live Agent runtime in P5.
- Production dashboarding, paging, mature SLOs, incident management, capacity planning, cloud secrets, and deployment hardening remain residual operations work.

## Expected Validation Ladder

Always run after parser-truth edits:

```bash
npm run check:plan
git diff --check
```

For `DD-P5-S1` contract/execution-model docs:

```bash
npm run test:app:workers
npm run check:plan
git diff --check
```

Escalate as P5 adds migrations, repositories, workers, or observability:

```bash
npm run test:db:migrations
npm run test:app:workers
npm run probe:observability
npm run check:boundaries
npm run typecheck
npm test
npm run check:plan
git diff --check
```

Run agent/review/evidence gates only when P5 handoff touches their contracts:

```bash
npm run test:agent
npm run test:review
npm run test:evidence
```

## Blockers

- None currently known for `DD-P5-S1` planning execution.
- P6 Agent runtime must wait for accepted P5 worker durability evidence.
- Production dashboard/SLO/incident work is not required for `DD-P5-S1`; it must remain residual unless a later production-ops pack explicitly owns it.

## Residuals / Notes

- P6 Agent runtime, Pi provider integration, model auth/profile rotation, live LLM sessions, tool allowlist enforcement, validator/merchant-review runtime gates, and provider cost/failure audit remain residual.
- Production dashboarding, paging, mature SLOs, incident management, capacity planning, cloud observability backend selection, cloud secret management, and deployment hardening remain residual.
- Non-POS producers and external POS repository/runtime hookup beyond the accepted Data Dyna-side P4 proof remain residual.
- Exactly-once processing remains out of scope unless a later accepted slice designs and tests that stronger claim.

## Master Writeback Evidence

- `data-dyna-external-producer-integration` reached `PACK_COMPLETE` with accepted P4 closeout evidence.
- P4 evidence covers the POS `pos.order_paid` producer contract, mapper, authenticated `/events` delivery proof, non-blocking failure classification, local/test probe, observability notes, replay/backfill handoff, and explicit P5/P6/production residuals.
- Master tracker writeback marks `DD-PR-MASTER-P4` done and activates `DD-PR-MASTER-P5`; this pack is the concrete P5 durable worker foundation queue.

## Machine State

- active_step: `DD-P5-S1`
- latest_completed_step: `DD-PR-MASTER-P4`
- intended_handoff: `execute-plan`
- latest_plan_summary: Created P5 durable worker foundation pack with OpenClaw/Pi-inspired handoff boundaries and activated DD-P5-S1.
- latest_verification:
  - `P4 external producer integration STATUS/WORKSET are PACK_COMPLETE with done=5 pending=0.`
  - `OpenClaw/Pi references were read and translated into P5 planning principles: typed capabilities, durable run records, bounded context handoff, tool-policy seams, and fail-closed residuals.`
  - `P5 pack preserves P6 Agent runtime and production dashboard/SLO/incident management as residuals.`
