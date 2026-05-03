# data-dyna Durable Worker Foundation Workset

## Stage Order

- [ ] `DD-P5-S1` durable worker contract and execution-model decision
- [ ] `DD-P5-S2` durable job schema and repository seam
- [ ] `DD-P5-S3` bounded worker executors and checkpointed deterministic processing
- [ ] `DD-P5-S4` retry, dead-letter, and failure-classification proof
- [ ] `DD-P5-S5` worker observability, probe, and operator runbook
- [ ] `DD-P5-S6` P6 Agent-runtime handoff packet and residual gate
- [ ] `DD-P5-CLOSEOUT-S1` P5 closeout audit

## Active Stage

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

## Slice Ownership

### `DD-P5-S1`

- Allowed repo surfaces:
  - `docs/workers/durable-worker-foundation.md`.
  - `src/app/workers/README.md` only for a minimal pointer if needed.
  - `docs/plan/*` parser-truth writeback only if needed for planning correction.
- Disallowed surfaces:
  - SQL migrations, repository implementation, or worker executor implementation before contract acceptance.
  - Live Pi/LLM runtime, provider auth, Agent sessions, or P6 sidecar execution.
  - Production dashboards, paging, mature SLO, or incident-management implementation.

### `DD-P5-S2`

- Allowed repo surfaces:
  - SQL migrations for worker job/checkpoint/dead-letter substrate.
  - App-layer worker job repository interfaces/implementations under `src/app/**`.
  - Repository and migration tests under `tests/**`.
  - `scripts/check-db-migrations.mjs` only if required by migration safety.
- Disallowed surfaces:
  - Deterministic Core imports of `pg`, Fastify, queue clients, provider SDKs, or Agent runtime.
  - Distributed broker setup unless S1 explicitly accepted it.
  - Prose-only dead-letter state with no persisted audit.

### `DD-P5-S3`

- Allowed repo surfaces:
  - `src/app/workers/**` executable adapters and runner seams.
  - Small app-layer repositories needed to read accepted raw events and persist owned outputs.
  - Tests for bounded batch processing, rerun idempotency, and checkpoint resume.
- Disallowed surfaces:
  - Agent-generated hypotheses, merchant-review mutations, or business action execution.
  - Unbounded production history scans in tests.
  - Runtime HTTP server/provider imports into deterministic Core modules.

### `DD-P5-S4`

- Allowed repo surfaces:
  - Worker retry/dead-letter classification logic.
  - App-layer job repository transitions.
  - Tests for retry count, backoff metadata, failed checkpoint behavior, and dead-letter audit.
- Disallowed surfaces:
  - Hot-loop retry behavior.
  - Dead-letter payloads that expose tokens, idempotency keys, payment/customer data, or merchant-sensitive details.
  - Agent remediation or production incident automation.

### `DD-P5-S5`

- Allowed repo surfaces:
  - Worker observability seams reusing P3-style logs/metrics or the smallest equivalent app-layer additions.
  - Targeted worker probe/runbook docs.
  - Tests/probes for redaction-safe worker lifecycle evidence.
- Disallowed surfaces:
  - Production observability backend/vendor dashboard setup as a P5 completion requirement.
  - Paging/on-call policy, mature SLO, incident-management process, or capacity planning implementation.
  - Secrets or raw payload details in probe/log/metric output.

### `DD-P5-S6`

- Allowed repo surfaces:
  - P6 handoff docs such as `docs/workers/p6-agent-runtime-handoff.md`.
  - Type-only or contract-only handoff seams if needed to keep future Agent inputs bounded.
  - Tests that assert forbidden Agent/runtime imports or mutation authority remain absent.
- Disallowed surfaces:
  - Live Pi provider integration, model auth/profile rotation, Agent sessions, or LLM calls.
  - Direct Agent access to arbitrary SQL, raw payloads, secrets, or mutation tools.
  - Treating LLM output as facts, evidence, or merchant decisions.

### `DD-P5-CLOSEOUT-S1`

- Allowed repo surfaces:
  - `docs/plan/*` parser-truth writeback.
  - Final P5 audit notes and residual handoff.
  - Master tracker update recommendation.
- Disallowed surfaces:
  - New implementation outside reviewed P5 evidence.
  - Hidden P6 Agent runtime, production dashboard/SLO/incident, or business-mutation completion claims.

## Continuous Wave Ladder

| Order | Slice | Phase loop | Accepted-review next step |
|---|---|---|---|
| 1 | `DD-P5-S1` | `execute -> review` | activate `DD-P5-S2` |
| 2 | `DD-P5-S2` | `execute -> review` | activate `DD-P5-S3` |
| 3 | `DD-P5-S3` | `execute -> review` | activate `DD-P5-S4` |
| 4 | `DD-P5-S4` | `execute -> review` | activate `DD-P5-S5` |
| 5 | `DD-P5-S5` | `execute -> review` | activate `DD-P5-S6` |
| 6 | `DD-P5-S6` | `execute -> review` | activate `DD-P5-CLOSEOUT-S1` |
| 7 | `DD-P5-CLOSEOUT-S1` | `review -> accepted-writeback` | activate `PACK_COMPLETE` or P6 successor pack |
| terminal | `PACK_COMPLETE` | `closeout` | repo-local closeout prompt surface, then master_plan writeback for P6 |

`currentWave/maxWaves` or any scheduler wave count is not objective-completion proof; only parser truth and accepted review evidence can permit terminal closeout.

## Expected Verification

For parser-truth writeback:

```bash
npm run check:plan
git diff --check
plan_sync /home/peng/dt-git/github/data-dyna/docs/plan
```

For `DD-P5-S1` contract/execution-model docs:

```bash
npm run test:app:workers
npm run check:plan
git diff --check
```

General validation escalation for P5 implementation slices:

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

Run Agent/review/evidence gates only when handoff contracts touch them:

```bash
npm run test:agent
npm run test:review
npm run test:evidence
```

## Execution Notes

- This pack is active because P4 external producer integration reached `PACK_COMPLETE` and P5 is the next production-readiness gate before Agent runtime.
- P5 must start from current contract-only worker seams and make durability claims only after tests/probes support them.
- P5 should prefer small, local/test-verifiable PostgreSQL-backed durability before introducing a broker or external scheduler.
- P5 should translate OpenClaw/Pi lessons into worker-ready architecture: typed capabilities, durable run records, bounded handoff summaries, explicit tool-policy seams, context-budget-aware future Agent inputs, and fail-closed ownership boundaries.
- If a slice requires live LLM calls, Pi provider credentials, Agent sessions, model failover, production dashboards, paging, mature SLOs, or cloud incident operations, route `needs_replan` rather than expanding P5.

## Residual Queue

Known out-of-scope residuals for this P5 pack:

- P6: full Agent runtime, live Pi provider integration, model auth/profile rotation, Agent sessions, tool allowlist enforcement, validator/merchant-review runtime governance, provider cost/failure audit, and no-direct-mutation tests.
- Full production observability backend selection, dashboards, paging policy, mature SLO/incident-management process, capacity planning, and on-call ownership.
- Cloud production secret management, deployment hardening, rollout/rollback, backup/restore, and compliance operations.
- Non-POS producers and external POS repository/runtime hookup beyond the Data Dyna-side local/test P4 proof.
- Exactly-once worker semantics beyond the explicitly tested durable/idempotent guarantees in this pack.
- Master tracker follow-up after this pack closes: mark `DD-PR-MASTER-P5` done and activate `DD-PR-MASTER-P6`.

## Machine Queue

- active_step: `DD-P5-S1`
- latest_completed_step: `DD-PR-MASTER-P4`
- intended_handoff: `execute-plan`
- latest_plan_summary: Created P5 durable worker foundation pack with OpenClaw/Pi-inspired handoff boundaries and activated DD-P5-S1.
- latest_verification:
  - `P4 external producer integration STATUS/WORKSET are PACK_COMPLETE with done=5 pending=0.`
  - `OpenClaw/Pi references were read and translated into P5 planning principles: typed capabilities, durable run records, bounded context handoff, tool-policy seams, and fail-closed residuals.`
  - `P5 pack preserves P6 Agent runtime and production dashboard/SLO/incident management as residuals.`
