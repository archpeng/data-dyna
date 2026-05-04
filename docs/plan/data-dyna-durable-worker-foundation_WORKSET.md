# data-dyna Durable Worker Foundation Workset

## Stage Order

- [x] `DD-P5-S1` durable worker contract and execution-model decision
- [x] `DD-P5-S2` durable job schema and repository seam
- [x] `DD-P5-S3` bounded worker executors and checkpointed deterministic processing
- [x] `DD-P5-S4` retry, dead-letter, and failure-classification proof
- [x] `DD-P5-S5` worker observability, probe, and operator runbook
- [x] `DD-P5-S6` P6 Agent-runtime handoff packet and residual gate
- [x] `DD-P5-CLOSEOUT-S1` P5 closeout audit

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
## Current Wave Plan

- waveId: `wave-closeout`
- parent_step: `DD-P5-CLOSEOUT-S1`
- selected_slice: `DD-P5-CLOSEOUT-S1`
- handoff_after_review: `repo-local closeout prompt surface`
- dominant_owner_boundary: P5 closeout audit over accepted durable worker evidence and residuals; no new P6 Agent runtime, production operations, business mutation, or hidden implementation expansion.

Linear review steps for `execution-reality-audit`:

1. Audit accepted P5 evidence across worker contract, schema/repository, executors, checkpoints, retries, dead letters, observability, probe/runbook, and P6 handoff residuals.
2. Confirm all non-deferred P5 slices have accepted review evidence before any terminal parser truth writeback.
3. Preserve residual handoff for P6 Agent runtime/provider integration, runtime tool policy, validator/merchant-review gates, production dashboards, paging, mature SLOs, incident management, cloud hardening, and capacity planning.
4. Validate with `npm run test:db:migrations`, `npm run test:app:workers`, `npm run probe:observability`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, `git diff --check`, and `plan_sync docs/plan`.
5. If closeout passes, write parser truth to `PACK_COMPLETE` and hand off to the repo-local closeout prompt surface.

Exit criteria before terminalization:

1. P5 durable worker evidence is accepted across schema/repository, bounded executors, checkpoint recovery, retry/dead-letter audit, observability/probe/runbook, and P6 handoff.
2. No P6 Agent runtime, Pi provider integration, direct mutation authority, production dashboards/SLOs/incidents, or exactly-once semantics are falsely claimed.
3. README/PLAN/STATUS/WORKSET can be safely written to `PACK_COMPLETE` only after closeout review accepts.
4. The closeout validation commands pass.

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
- P5 started from contract-only worker seams; after accepted `DD-P5-CLOSEOUT-S1`, bounded local/test executors, classified retry/dead-letter handling, local/test worker observability/probe/runbook evidence, and P6 handoff packet evidence are accepted and terminal for this pack, while production scheduling, production dashboards/SLOs/paging/incidents, and live P6 runtime still require later tests/probes.
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

## Execution Evidence

### `DD-P5-S1` execute wave-1

- Result: created the P5 durable worker foundation contract and selected a PostgreSQL-backed job/checkpoint/dead-letter execution model without implementing schema, repositories, executors, live Agent runtime, or production operations.
- Artifacts: `docs/workers/durable-worker-foundation.md`, `src/app/workers/README.md`, and parser-truth evidence writeback.
- Contract coverage: selected execution model, future `worker_jobs` / `worker_job_attempts` / `worker_checkpoints` / `worker_dead_letters` substrate names, job identity, attempt audit, typed capabilities, checkpoint/watermark rules, retry/dead-letter policy, idempotent-write rules, worker DAG, redaction-safe observability, fail-closed rules, and P6 read-only handoff surface.
- Boundary evidence: deterministic Core remains untouched; no SQL migration, repository implementation, worker executor, broker, cloud scheduler, production dashboard, paging/SLO/incident work, Pi provider integration, LLM execution, Agent sessions, arbitrary SQL capability, direct fact mutation, or business mutation worker was added.
- Verification: `npm run test:app:workers`, `npm run check:plan`, and `git diff --check` passed.
- Next runtime route: same-slice `review` via `execution-reality-audit`; accepted review is the normal writeback point for activating `DD-P5-S2`.

### `DD-P5-S2` execute wave-2

- Result: added the minimal PostgreSQL-backed durable worker substrate and app-layer repository seam for worker jobs, attempts, checkpoints, retries, and dead letters.
- Artifacts: `migrations/0009_worker_jobs.sql`, `src/app/workers/durable-worker-job-repository.ts`, `src/app/workers/index.ts`, `tests/app-worker-job-repository-s2.spec.ts`, `scripts/check-db-migrations.mjs`, `package.json`, and `src/app/workers/README.md`.
- Contract coverage: `worker_jobs`, `worker_job_attempts`, `worker_checkpoints`, and `worker_dead_letters` persist tenant/source-scoped identity, worker kind, input/output watermarks, status transitions, attempt counts, bounded max attempts, failure class, safe diagnostic summary, and freshness metadata.
- Boundary evidence: repository code is app-layer only, deterministic Core remains free of `pg`, Fastify, queue clients, provider SDKs, and Agent runtime imports, no broker/scheduler/dashboard/P6 runtime was added, and no exactly-once claim was introduced.
- Verification: `npm run test:db:migrations`, `npm run test:app:workers`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` passed.
- Next runtime route: same-slice `review` via `execution-reality-audit`; accepted review is the normal writeback point for activating `DD-P5-S3`.

### `DD-P5-S3` execute wave-3

- Result: added bounded local/test executors for projection, snapshot, benchmark, and evidence workers that claim one durable job, run deterministic Core functions, write owned outputs through injected stores, then checkpoint and complete through the S2 repository seam.
- Artifacts: `src/app/workers/bounded-worker-runner.ts`, `src/app/workers/projection-worker.ts`, `src/app/workers/snapshot-worker.ts`, `src/app/workers/benchmark-worker.ts`, `src/app/workers/evidence-worker.ts`, `src/app/workers/worker-contract.ts`, `src/app/workers/index.ts`, `tests/app-worker-executors-s3.spec.ts`, `tests/app-workers-s5.spec.ts`, `package.json`, `src/app/workers/README.md`, and `docs/workers/durable-worker-foundation.md`.
- Contract coverage: executors process bounded inputs through deterministic projection/snapshot/benchmark/evidence functions, preserve deterministic evidence outputs with zero LLM-generated claims, prove rerun idempotency, expose resume watermark reads, and do not checkpoint after output-store write failure.
- Boundary evidence: worker executors use injected job repositories and output stores; deterministic Core remains free of `pg`, Fastify, queue clients, provider SDKs, and Agent runtime imports; no production scheduler, broker, dashboard, live Agent/Pi/LLM runtime, merchant-review side effects, business mutation execution, or exactly-once claim was added.
- Verification: `npm run test:app:workers`, `npm run test:evidence`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` passed.
- Next runtime route: same-slice `review` via `execution-reality-audit`; accepted review is the normal writeback point for activating `DD-P5-S4`.

### `DD-P5-S4` execute wave-4

- Result: added classified retry/dead-letter handling for bounded worker executors without adding Agent remediation, production incident tooling, or dashboard dependency.
- Artifacts: `src/app/workers/worker-failure-policy.ts`, `src/app/workers/bounded-worker-runner.ts`, projection/snapshot/benchmark/evidence worker input types, `src/app/workers/worker-contract.ts`, `src/app/workers/index.ts`, `tests/app-worker-failures-s4.spec.ts`, `tests/app-workers-s5.spec.ts`, `package.json`, `src/app/workers/README.md`, and `docs/workers/durable-worker-foundation.md`.
- Contract coverage: transient storage/runtime and unexpected failures retry with bounded backoff; contract, tenant-policy, idempotency, or exhausted attempts dead-letter with safe diagnostics, reason code, attempt count, next action, and persisted repository transition.
- Boundary evidence: safe diagnostics redact token/secret/idempotency/payment/customer/raw-payload/body/merchant-sensitive values; failed output and checkpoint writes do not publish freshness; dead-lettered jobs remain queryable in the audit test repository; successful reruns replace deterministic output.
- Verification: `npm run test:app:workers`, `npm run probe:observability`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` passed.
- Next runtime route: same-slice `review` via `execution-reality-audit`; accepted review is the normal writeback point for activating `DD-P5-S5`.

### `DD-P5-S5` execute wave-5

- Result: added local/test worker lifecycle observability, a worker probe, and runbook guidance without requiring production dashboards, paging, mature SLOs, incident management, external services, or Agent runtime.
- Artifacts: `src/app/workers/worker-observability.ts`, `src/app/workers/bounded-worker-runner.ts`, projection/snapshot/benchmark/evidence worker input types, `src/app/observability/runtime-log.ts`, `src/app/observability/runtime-metrics.ts`, `scripts/probe-worker-observability.ts`, `tests/app-worker-observability-s5.spec.ts`, `package.json`, `src/app/workers/README.md`, and `docs/workers/durable-worker-foundation.md`.
- Contract coverage: optional injected sinks emit `worker.job.started`, `worker.job.checkpointed`, `worker.job.completed`, `worker.job.failed`, `worker.job.retry_scheduled`, and `worker.job.dead_lettered`; metrics cover worker jobs, checkpoints, duration, and lag with bounded labels.
- Boundary evidence: worker observability logs/metrics/probe output exclude bearer tokens, idempotency keys, raw payloads, payment/customer/card values, and merchant-sensitive details; the probe uses in-memory local/test sinks and documents production dashboards/SLOs/paging/incidents as residual.
- Verification: `npm run test:app:workers`, `npm run probe:observability`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` passed; `plan_sync` reports P5 done=4 pending=3 with DD-P5-S5 executed pending review.
- Next runtime route: same-slice `review` via `execution-reality-audit`; accepted review is the normal writeback point for activating `DD-P5-S6`.

### `DD-P5-S6` execute wave-6

- Result: added the P6 Agent-runtime handoff packet and residual gate without requiring live LLM calls, Pi provider credentials, Agent sessions, model auth, production runtime selection, dashboards, paging, SLOs, or incident management.
- Artifacts: `docs/workers/p6-agent-runtime-handoff.md`, `tests/agent-worker-handoff-s6.spec.ts`, `package.json`, `docs/workers/durable-worker-foundation.md`, `src/app/workers/README.md`, and parser-truth writeback.
- Contract coverage: the handoff defines durable worker outputs and freshness metadata for future `AgentContextBundle` preparation, prepared context attempts, worker freshness refs, context budgets, allowed read-only capabilities, forbidden mutation/provider/runtime capabilities, and fail-closed policy.
- Boundary evidence: P5 does not grant arbitrary SQL, raw payload reads, secret reads, worker mutation tools, direct Core/business mutation, live Pi/LLM runtime control, provider/model selection, Agent session creation, LLM output-as-fact, or production operations completion.
- Verification: `npm run test:agent`, `npm run test:app:workers`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` passed; `plan_sync` reports P5 done=5 pending=2 with DD-P5-S6 executed pending review.
- Next runtime route: same-slice `review` via `execution-reality-audit`; accepted review is the normal writeback point for activating `DD-P5-CLOSEOUT-S1`.

## Review Evidence

### `DD-P5-S1` review wave-1

- Review compared `docs/workers/durable-worker-foundation.md`, `src/app/workers/README.md`, `src/app/workers/**`, `tests/app-workers-s5.spec.ts`, raw-event migrations, P2/P3/P4 source-truth docs, and parser truth against the DD-P5-S1 deliverables and stop boundaries.
- Verdict: accepted with successor residuals for DD-P5-S2 schema/repository implementation, bounded worker executors, retry/dead-letter proof, worker observability/runbook, P6 read-only handoff packet, production operations, non-POS producers, exactly-once semantics, and live Agent/Pi/LLM runtime.
- Validation during review: `npm run test:app:workers`; `npm run check:plan`; `git diff --check`; trailing-whitespace scan over changed/new files.
- Parser truth now activates `DD-P5-S2` for the durable job schema and repository seam.

### `DD-P5-S2` review wave-2

- Review compared `migrations/0009_worker_jobs.sql`, `src/app/workers/durable-worker-job-repository.ts`, `tests/app-worker-job-repository-s2.spec.ts`, `scripts/check-db-migrations.mjs`, `src/app/workers/index.ts`, worker docs, and parser truth against the DD-P5-S2 deliverables and stop boundaries.
- Verdict: accepted with successor residuals for bounded worker executors, output repositories, checkpoint-after-output-write proof, richer retry/dead-letter classification, worker observability/runbook, P6 read-only handoff packet, production operations, exactly-once semantics, and live Agent/Pi/LLM runtime.
- Validation during review: `npm run test:db:migrations`; `npm run test:app:workers`; `npm run check:boundaries`; `npm run typecheck`; `npm test`; `npm run check:plan`; `git diff --check`; `npm run check:schema-migrations`; changed-file trailing-whitespace scan; plan_sync.
- Parser truth now activates `DD-P5-S3` for bounded worker executors and checkpointed deterministic processing.

### `DD-P5-S3` review wave-3

- Review compared `src/app/workers/bounded-worker-runner.ts`, projection/snapshot/benchmark/evidence worker executors, worker contract exports, executor tests, worker docs, and parser truth against the DD-P5-S3 deliverables and stop boundaries.
- Verdict: accepted with successor residuals for richer retry/dead-letter classification, production output repositories/scheduler, worker observability/runbook, P6 read-only handoff packet, production operations, exactly-once semantics, and live Agent/Pi/LLM runtime.
- Validation during review: `npm run test:app:workers`; `npm run test:evidence`; `npm run check:boundaries`; `npm run typecheck`; `npm test`; `npm run check:plan`; `git diff --check`; import scan for app worker/Core forbidden runtime imports; plan_sync.
- Parser truth now activates `DD-P5-S4` for retry, dead-letter, and failure-classification proof.

### `DD-P5-S4` review wave-4

- Review compared `src/app/workers/worker-failure-policy.ts`, `src/app/workers/bounded-worker-runner.ts`, projection/snapshot/benchmark/evidence worker failure-policy wiring, durable job repository retry/deadLetter transitions, worker contract exports, `tests/app-worker-failures-s4.spec.ts`, worker docs, and parser truth against the DD-P5-S4 deliverables and stop boundaries.
- Review hardening fixed safe diagnostic string redaction so error messages and nested string values cannot preserve bearer/token/idempotency/payment/customer/card details by value.
- Verdict: accepted with successor residuals for worker observability/probe/runbook, P6 read-only handoff packet, production output repositories/scheduler, production operations, exactly-once semantics, and live Agent/Pi/LLM runtime.
- Validation during review: `npm run test:app:workers`; `npm run probe:observability`; `npm run check:boundaries`; `npm run typecheck`; `npm test`; `npm run check:plan`; `git diff --check`; plan_sync.
- Parser truth now activates `DD-P5-S5` for worker observability, probe, and operator runbook.

### `DD-P5-S5` review wave-5

- Review compared `src/app/workers/worker-observability.ts`, `src/app/workers/bounded-worker-runner.ts`, `src/app/observability/runtime-log.ts`, `src/app/observability/runtime-metrics.ts`, projection/snapshot/benchmark/evidence observability wiring, `scripts/probe-worker-observability.ts`, `tests/app-worker-observability-s5.spec.ts`, worker docs, and parser truth against the DD-P5-S5 deliverables and stop boundaries.
- Review hardening made the worker probe print explicit safe retry/dead-letter diagnosis evidence with failure class, reason code, and next action instead of only asserting it inside captured logs/metrics.
- Verdict: accepted with successor residuals for P6 read-only handoff packet, production output repositories/scheduler, production operations, exactly-once semantics, and live Agent/Pi/LLM runtime.
- Validation during review: `npm run test:app:workers`; `npm run probe:observability`; `npm run check:boundaries`; `npm run typecheck`; `npm test`; `npm run check:plan`; `git diff --check`; plan_sync.
- Parser truth now activates `DD-P5-S6` for P6 Agent-runtime handoff packet and residual gate.

### `DD-P5-S6` review wave-6

- Review compared `docs/workers/p6-agent-runtime-handoff.md`, `tests/agent-worker-handoff-s6.spec.ts`, `package.json`, `src/agent/context-bundle.ts`, `src/agent/agent-tools.ts`, `src/app/workers/worker-contract.ts`, `docs/workers/durable-worker-foundation.md`, `src/app/workers/README.md`, and parser truth against the DD-P5-S6 deliverables and stop boundaries.
- Verdict: accepted with successor residuals for closeout audit, live P6 Agent/Pi/LLM runtime, runtime tool-policy enforcement, validator/merchant-review runtime gates, provider failure/cost audit, no-direct-mutation tests, production operations, cloud hardening, and exactly-once semantics.
- Validation during review: `npm run test:agent`; `npm run test:app:workers`; `npm run check:boundaries`; `npm run typecheck`; `npm test`; `npm run check:plan`; `git diff --check`; plan_sync.
- Parser truth now activates `DD-P5-CLOSEOUT-S1` for P5 closeout audit.

### `DD-P5-CLOSEOUT-S1` closeout review

- Review audited accepted P5 evidence across worker contract, schema/repository, bounded executors, checkpoint recovery, retry/dead-letter classification, observability, probe/runbook, P6 handoff residuals, parser truth, and master tracker recommendation.
- Verdict: accepted with successor residuals for P6 Agent runtime/Pi provider integration, runtime tool-policy enforcement, validator/merchant-review runtime gates, provider failure/cost audit, no-direct-mutation tests, production scheduler/output repositories, dashboards, paging, mature SLOs, incident management, cloud hardening, capacity planning, non-POS producers, external POS runtime hookup, and exactly-once semantics.
- Validation during closeout review: `npm run test:db:migrations`; `npm run test:app:workers`; `npm run probe:observability`; `npm run check:boundaries`; `npm run typecheck`; `npm test`; `npm run check:plan`; `git diff --check`; plan_sync.
- Master tracker recommendation: route `master_plan` / `plan-creator` after repo-local closeout to mark `DD-PR-MASTER-P5` done and activate `DD-PR-MASTER-P6` for the concrete Agent runtime integration pack.
- Parser truth now marks this pack `PACK_COMPLETE`; repo-local closeout prompt surface is the only next route for this completed pack.

## Machine Queue

- active_step: `PACK_COMPLETE`
- latest_completed_step: `PACK_COMPLETE`
- intended_handoff: `autopilot-closeout`
- latest_closeout_summary: Closed P5 durable worker foundation pack.
- latest_verification:
  - `Parser truth is terminal: README active slice is PACK_COMPLETE; durable-worker-foundation STATUS/WORKSET report 7 done, 0 pending via plan_sync.`
  - `Completed waves: S1 contract/model; S2 schema/repository; S3 bounded executors/checkpoints; S4 retry/dead-letter policy; S5 observability/probe/runbook; S6 P6 handoff; CLOSEOUT audit accepted.`
  - `Validation gathered before terminalization: npm run test:db:migrations; npm run test:app:workers; npm run probe:observability; npm run check:boundaries; npm run typecheck; npm test; npm run check:plan; git diff --check.`
  - `Post-terminalization evidence: npm run check:plan; git diff --check; plan_sync docs/plan passed with durable-worker-foundation done=7 pending=0.`
  - `Final code state includes PostgreSQL durable worker job/checkpoint/dead-letter schema, app-layer repository, bounded local/test worker runner/executors, failure classification, safe diagnostics, worker telemetry sinks, observability probe, and P6 read-only handoff docs/tests.`
  - `docs/plan/README.md`
  - `docs/plan/data-dyna-durable-worker-foundation_STATUS.md`
  - `docs/plan/data-dyna-durable-worker-foundation_WORKSET.md`
  - `docs/plan/data-dyna-durable-worker-foundation_PLAN.md`
  - `docs/workers/durable-worker-foundation.md`
  - `docs/workers/p6-agent-runtime-handoff.md`
  - `migrations/0009_worker_jobs.sql`
  - `src/app/workers/**`
  - `tests/app-worker-*.spec.ts`
  - `tests/agent-worker-handoff-s6.spec.ts`
- terminal: `true`