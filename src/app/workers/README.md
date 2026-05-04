# App Worker Foundation

`DD-RUNTIME-S5` started with contract-only worker seams for future script/runner entrypoints. `DD-P5-S3` accepted bounded local/test executors for projection, snapshot, benchmark, and evidence jobs, `DD-P5-S4` accepted bounded retry/dead-letter failure classification, `DD-P5-S5` accepted local/test worker lifecycle observability, and `DD-P5-S6` accepted the P6 Agent-runtime handoff packet without implementing a broker queue, production scheduler, production dashboards, Agent runtime, or business mutation execution.

## Contracts

```text
src/app/workers/projection-worker.ts
src/app/workers/snapshot-worker.ts
src/app/workers/benchmark-worker.ts
src/app/workers/evidence-worker.ts
```

Each file exports a `WorkerContract` descriptor and bounded executor through `src/app/workers/index.ts`.

## Current mode

- invocation mode: simple `script_runner` seam, optionally invoked later by npm scripts, cron, or an external scheduler;
- implementation state: `bounded_local_executor`;
- reliability scope: queue/checkpoint are repository-backed for local/test executors; retry/dead-letter use classified safe diagnostics through the S2 repository seam;
- observability scope: optional injected P3-style log/metric sinks emit local/test worker started, checkpointed, completed, failed, retry, dead-letter, duration, and lag evidence;
- runtime scope: no production scheduler, deployment, dashboard/SLO/paging/incident ownership, Agent runtime, merchant-review side effect, or business mutation execution is implemented here.

## P5 S2 durable repository substrate

`src/app/workers/durable-worker-job-repository.ts` now defines the app-layer durable job repository seam and PostgreSQL implementation for enqueue, claim, heartbeat, checkpoint, complete, retry, dead-letter, and freshness reads. It persists worker job lifecycle state through `worker_jobs`, `worker_job_attempts`, `worker_checkpoints`, and `worker_dead_letters` without importing `pg` into deterministic Core.

`DD-P5-S3` wires bounded local/test executors to this repository seam. `DD-P5-S4` adds bounded retry/dead-letter classification and safe diagnostics for executor failures. `DD-P5-S5` adds accepted optional local/test worker observability through injected runtime log/metric sinks; production schedulers, durable production output repositories, production dashboards, and incident operations remain later/residual work.

## P5 S3 bounded local/test executors

`src/app/workers/bounded-worker-runner.ts` claims one durable job, runs a deterministic output builder, writes owned output through an injected store, then checkpoints and completes the job. Projection, snapshot, benchmark, and evidence worker modules use this runner with existing deterministic Core functions.

These executors are local/test adapters, not production schedulers. They do not run Agent generation, merchant-review side effects, business mutations, external services, or unbounded production history scans.

## P5 S4 retry/dead-letter classification

`src/app/workers/worker-failure-policy.ts` classifies worker failures into transient storage, transient runtime, contract violation, tenant policy, idempotency conflict, or unexpected classes. Retryable failures get bounded backoff before `WorkerJobRepository.retry`; terminal or exhausted failures are persisted through `WorkerJobRepository.deadLetter` with redacted safe diagnostics and an operator next action.

Safe diagnostics redact token, secret, idempotency, payment, customer, raw payload/body, and merchant-sensitive values. This is durable audit evidence for local/test workers, not Agent remediation or production incident automation.

## P5 S5 local/test observability

`src/app/workers/worker-observability.ts` records redaction-safe worker lifecycle evidence when a runner receives optional `observability` sinks:

- logs: `worker.job.started`, `worker.job.checkpointed`, `worker.job.completed`, `worker.job.failed`, `worker.job.retry_scheduled`, and `worker.job.dead_lettered`;
- metrics: `data_dyna_worker_jobs_total`, `data_dyna_worker_checkpoints_total`, `data_dyna_worker_duration_ms`, and `data_dyna_worker_lag_ms`;
- bounded labels/fields: worker kind, source/producer scope, outcome, failure class, reason code, correlation id, job id, attempt id/count, and lag/duration values.

Run local/test proof with:

```bash
npm run probe:observability
```

The worker portion uses in-memory sinks and prints safe success, retry, checkpoint-resume, and dead-letter evidence. It must not print bearer tokens, idempotency keys, raw payloads, payment/customer/card values, merchant-sensitive details, or production infrastructure claims.

## P5 S6 P6 handoff packet

`docs/workers/p6-agent-runtime-handoff.md` defines the P5-to-P6 handoff packet for future `AgentContextBundle` preparation. It lists allowed read-only capabilities such as `read_worker_freshness`, `read_projection_summary`, `read_snapshot_summary`, `read_benchmark_opportunity_gaps`, `read_evidence_records`, `read_dead_letter_diagnosis`, and `build_agent_context_bundle`; it forbids arbitrary SQL, raw payloads, secrets, worker mutation tools, live Pi/LLM runtime control, and direct Core/business mutation authority.

## P5 durable worker contract

`docs/workers/durable-worker-foundation.md` defines the accepted P5 execution-model contract for job, checkpoint, retry, dead-letter, observability, and P6 read-only handoff work. S1 selected the model, S2 added the repository substrate, S3 accepted bounded local/test executors, S4 accepted retry/dead-letter classification proof, S5 accepted local/test worker observability/probe/runbook evidence, and S6 accepted the P6 handoff packet without implementing live Agent runtime.
