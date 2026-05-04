# Data Dyna Durable Worker Foundation

Status: `DD-P5-S5` worker observability, probe, and operator runbook evidence accepted; `DD-P5-S6` P6 Agent-runtime handoff packet and residual gate evidence accepted. `DD-P5-S1` selected the execution model, `DD-P5-S2` added the PostgreSQL job/checkpoint/dead-letter substrate and app-layer repository seam, `DD-P5-S3` added bounded local/test executors, `DD-P5-S4` added classified retry/dead-letter handling with safe diagnostics, `DD-P5-S5` added redaction-safe local/test lifecycle logs, metrics, and probe evidence, and `DD-P5-S6` added `docs/workers/p6-agent-runtime-handoff.md`. This document still does not claim that production scheduling, observability dashboards, live P6 Agent runtime, business mutation execution, or exactly-once processing are implemented.

## Decision

P5 selects the smallest locally verifiable durable execution model:

```text
PostgreSQL-backed durable worker substrate
  + explicit app-layer worker job repository
  + script-runner worker executors
  + optional cron/external scheduler invocation later
  + no broker or cloud scheduler prerequisite
```

Reasoning:

1. The repo already uses PostgreSQL migrations and local/test DB gates for raw-event persistence.
2. P2 tenant identity and P4 idempotency evidence are stored in `raw_events` and can be reused as safe worker input identity.
3. A PostgreSQL-backed job/checkpoint/dead-letter substrate can be tested locally with the existing migration and worker test ladder.
4. A broker, cloud scheduler, production dashboard, paging policy, mature SLO, or incident process is operational maturity work, not a correctness prerequisite for the first durable worker proof.
5. The selected model keeps deterministic Core free of `pg`, Fastify, queue clients, provider SDKs, and Agent runtime imports because DB access remains in `src/app/**` repository/adapters.

`DD-P5-S2` adds these tables as the accepted PostgreSQL substrate:

```text
worker_jobs
worker_job_attempts
worker_checkpoints
worker_dead_letters
```

These names are the S2 schema/repository substrate. `DD-P5-S3` wires bounded local/test executors to that substrate, `DD-P5-S4` wires classified retry/dead-letter decisions to the repository transitions, and `DD-P5-S5` wires local/test lifecycle logs/metrics/probe evidence to the bounded runner. Later P5 slices still own P6 read-only handoff packaging.

## Current baseline

Accepted predecessor evidence:

1. P2 auth/tenancy: accepted `/events` writes carry tenant and producer identity, use bearer ingestion credentials, enforce tenant policy, and persist tenant-safe idempotency identity.
2. P3 observability: runtime logs and counters are redaction-safe and classify auth rejection, accepted, duplicate, invalid schema, tenant-policy rejection, request completion, duration, and runtime-error paths.
3. P4 POS producer: one `pos.order_paid` path delivers sanitized events through authenticated `POST /events`, proves accepted/duplicate/invalid/unauthorized/tenant-mismatch/transient-send-failure behavior, and preserves replay/backfill residuals.
4. Runtime worker seams: `src/app/workers/**` now exports projection, snapshot, benchmark, and evidence descriptors plus bounded local/test executors. `DD-P5-S2` adds the durable job repository substrate; `DD-P5-S3` wires executors to claim jobs, write owned outputs, checkpoint, and complete through that seam; `DD-P5-S4` persists classified retry/dead-letter failures with redacted safe diagnostics; `DD-P5-S5` emits redaction-safe local/test lifecycle logs, counters, duration, lag, and probe summaries.

## Non-goals and residuals

P5 after S5 still does not implement:

1. Worker npm scripts, production output repositories, production scheduler configuration, or production operations.
2. P6 Agent runtime, Pi provider integration, model auth/profile rotation, LLM execution, Agent sessions, or provider failover.
3. Agent direct mutation of facts, arbitrary SQL access, merchant-review side effects, or business action execution.
4. Production dashboarding, paging/on-call policy, mature SLOs, incident-management process, cloud observability backend selection, cloud secrets, deployment hardening, capacity planning, backup/restore, or rollout/rollback.
5. Non-POS producers beyond the accepted P4 POS `pos.order_paid` pilot path.
6. Exactly-once processing. P5 targets durable, auditable, idempotent reruns with tested guarantees, not an unqualified exactly-once claim.

## Durable worker ownership

| Worker kind | Current seam | Future durable input | Future owned output | Core boundary |
|---|---|---|---|---|
| `projection` | `src/app/workers/projection-worker.ts` | Accepted `raw_events` plus existing Datamesh inputs where applicable. | Business projections for sessions, carts, POS orders/payments/refunds, menu/items, members, RFM snapshots, and merchant actions. | May call deterministic projection functions; app adapter owns DB reads/writes and checkpoints. |
| `snapshot` | `src/app/workers/snapshot-worker.ts` | Business projections, brand/store/date selectors, and explicit merchant segment confirmations when present. | Store profile, metric, segment candidate, and confirmation snapshots. | May call deterministic snapshot functions; must not confirm a segment without explicit merchant input. |
| `benchmark` | `src/app/workers/benchmark-worker.ts` | Target and peer metric snapshots plus segment candidates. | Aggregate-only peer groups, benchmarks, and directional opportunity gaps. | May call deterministic benchmark functions; must not expose peer store IDs or causal-proof claims. |
| `evidence` | `src/app/workers/evidence-worker.ts` | Accepted experiment plans, merchant review lifecycle evidence, before/after metric snapshots, action effects, and guardrails. | Evidence records and directional before/after verdicts. | May call deterministic evidence functions; must not treat LLM output as evidence fact. |

The worker files remain ownership descriptors and now also expose bounded local/test executors, classified retry/dead-letter handling, and optional injected local/test observability sinks. Those executors are not production schedulers and do not claim production dashboards, mature SLOs, incident operations, P6 runtime, or exactly-once processing.

## Job identity contract

Each durable job must have a stable identity that is safe to replay and tenant-scoped. The S2 schema must preserve these fields or an accepted equivalent:

| Field | Purpose |
|---|---|
| `job_id` | Stable internal id for one durable job record. |
| `worker_kind` | One of `projection`, `snapshot`, `benchmark`, `evidence`. |
| `tenant_scope` | `merchant_id` and `store_id` when store-scoped; optional brand/aggregate scope only when explicitly designed. |
| `source_scope` | For raw-event-driven work: `source`, `producer_service`, and `producer_environment`. |
| `input_watermark` | Lower/upper cursor or bounded input range such as `received_at` plus `event_id` tie-breaker. |
| `idempotency_identity` | Deterministic input identity for enqueue/rerun, e.g. worker kind + tenant/source scope + input watermark + contract version. |
| `status` | `queued`, `claimed`, `running`, `succeeded`, `retry_scheduled`, `dead_lettered`, or `cancelled_by_operator` when explicitly supported. |
| `attempt_count` | Number of started attempts, bounded by policy. |
| `locked_by` / `locked_until` | Claim lease fields for local/test concurrent-claim proof. |
| `created_at` / `updated_at` / `started_at` / `completed_at` | Audit timestamps for lifecycle inspection. |
| `correlation_id` | Safe run correlation for logs/probes; never bearer tokens or idempotency keys. |

A duplicate enqueue with the same idempotency identity must return or reuse the existing job instead of creating ambiguous work.

## Attempt contract

Each started execution attempt must leave durable evidence. The future attempt record should include:

1. `attempt_id`, `job_id`, `attempt_number`, `worker_kind`, and tenant/source scope.
2. `claimed_by`, `started_at`, `heartbeat_at`, `finished_at`, and attempt duration.
3. `input_watermark_start` and `input_watermark_end` actually attempted.
4. Safe status: `started`, `checkpointed`, `succeeded`, `retryable_failed`, `terminal_failed`, or `dead_lettered`.
5. Safe failure class and public reason code when failed.
6. Redacted diagnostic summary with no raw payloads, bearer tokens, idempotency keys, payment/customer data, or merchant-sensitive details.

Attempts are audit records. They must not be the only place where retry/dead-letter state exists; the current job state must also reflect the next action.

## Lifecycle and typed capabilities

The app-layer worker repository exposes typed capabilities rather than arbitrary SQL:

1. `enqueue(workerKind, tenantScope, inputWatermark, idempotencyIdentity)` creates or returns a durable job.
2. `claim(workerKind, workerId, limit, now)` leases queued or retry-ready jobs without stealing unexpired leases.
3. `heartbeat(jobId, attemptId, checkpointHint, now)` records liveness without advancing committed checkpoints past successful writes.
4. `checkpoint(jobId, attemptId, outputWatermark, now)` records safe progress only after owned output writes have succeeded.
5. `complete(jobId, attemptId, finalWatermark, outputSummary, now)` marks success and publishes freshness metadata.
6. `retry(jobId, attemptId, failureClass, nextRunAt, safeError, now)` increments bounded retry state and schedules later execution.
7. `deadLetter(jobId, attemptId, failureClass, safeError, now)` makes terminal failure queryable and auditable.
8. `readFreshness(workerKind, tenantScope)` returns bounded output freshness for runbooks and future P6 context handoff.

P6 may later consume read-only capability outputs. It must not receive these mutation capabilities.

## Checkpoint and watermark contract

A checkpoint is a durable promise about processed input, so it must advance only after output persistence succeeds.

Rules:

1. Use a stable cursor with a tie-breaker, such as `(received_at, event_id)` for accepted raw events.
2. For store-scoped raw-event work, checkpoint scope must include `merchant_id`, `store_id`, `source`, `producer_service`, `producer_environment`, and `worker_kind`.
3. A job may record heartbeat progress while running, but committed checkpoint/watermark advancement is only allowed after owned writes succeed.
4. Failed jobs must leave the previous committed checkpoint intact.
5. Reruns from the same input watermark must be idempotent and must not duplicate, corrupt, or hide output facts.
6. Empty batches may update freshness only if the worker proves that the bounded input range was inspected.
7. Backfill/replay must use deterministic tenant/source/idempotency inputs from P2/P4, not inferred or rewritten identity.

## Retry and dead-letter policy

Failure classification must be explicit and bounded:

| Failure class | Retry behavior | Dead-letter behavior |
|---|---|---|
| `transient_storage` | Retry with bounded backoff. | Dead-letter after max attempts. |
| `transient_runtime` | Retry with bounded backoff. | Dead-letter after max attempts. |
| `contract_violation` | Do not hot-loop; usually terminal until contract/data is fixed. | Dead-letter with safe reason. |
| `tenant_policy` | Do not repair or infer identity inside worker. | Dead-letter or invalid-audit handoff with safe reason. |
| `idempotency_conflict` | Do not overwrite outputs. | Dead-letter with conflict summary. |
| `unexpected` | One bounded retry may be allowed if classified safe; otherwise terminal. | Dead-letter with redacted diagnostic summary. |

Default S2/S4 target: maximum three attempts unless a later slice documents and tests a different bounded value.

Dead-letter records must include enough safe evidence for local/test diagnosis:

1. job id, worker kind, tenant/source scope, input watermark, attempt count, failure class, public reason code, timestamps, and next operator action.
2. No bearer token, credential JSON, raw event payload, idempotency key, payment/customer/member/device data, raw entity id, merchant-sensitive item/payment details, or arbitrary stack trace with secrets.
3. Dead letters are persisted records, not dashboard-only signals or prose-only notes.

## Idempotent writes

Worker output repositories must own idempotency at the output boundary. The durable job table alone is not enough.

Rules:

1. Output identity must be deterministic from worker kind, tenant scope, source/input watermark, output type, and contract version.
2. Reprocessing the same job or input range must upsert the same logical output or no-op, not append duplicate facts.
3. A worker may not advance its checkpoint until all owned output writes for that range are successful.
4. A partially failed output write must remain visible through the job attempt/failure state and must not be hidden by a later checkpoint.
5. P5 workers may produce deterministic facts/evidence only; they must not run business mutation tools, merchant-review side effects, Agent generation, or LLM interpretation.

## Worker DAG

The P5 durable flow is ordered by data ownership, not by scheduler convenience:

```text
accepted raw_events
  -> projection worker
  -> business projection outputs
  -> snapshot worker
  -> metric/profile/segment snapshots
  -> benchmark worker
  -> aggregate peer benchmarks and opportunity gaps
  -> evidence worker
  -> evidence records and freshness metadata
  -> P6 read-only Agent handoff surface later
```

DAG rules:

1. Projection work starts from accepted `raw_events` only; invalid raw events are audit evidence, not business fact input.
2. POS remains the final fact source for orders, payments, and refunds; mini-program or analytics events must not be promoted into paid facts by workers.
3. Snapshot work may use merchant confirmations only when explicitly present; workers must not infer confirmed segment identity.
4. Benchmark work emits aggregate directional gaps only; peer store identities and non-aggregate peer data remain forbidden.
5. Evidence work requires merchant adoption refs and applied lifecycle evidence; LLM-generated claims are not evidence facts.
6. Later P6 Agent runtime may read bounded durable outputs and freshness metadata, but cannot become a worker dependency for P5 correctness.

## Observability contract

Worker observability must reuse P3 redaction principles.

Minimum lifecycle signals for later slices:

| Signal | Safe fields |
|---|---|
| `worker.job.enqueued` | worker kind, tenant/source scope, input watermark shape, status, correlation id. |
| `worker.job.claimed` | worker kind, job id, attempt number, lease status, correlation id. |
| `worker.job.checkpointed` | worker kind, checkpoint scope, output watermark, count-only output summary. |
| `worker.job.completed` | worker kind, duration, output freshness, count-only output summary. |
| `worker.job.retry_scheduled` | worker kind, failure class, attempt count, next run time. |
| `worker.job.dead_lettered` | worker kind, failure class, attempt count, safe reason code. |
| `worker.lag.observed` | worker kind, checkpoint age or input lag bucket, not raw payload identifiers. |

Forbidden in logs, metrics, probes, and dead-letter diagnostics:

1. Bearer tokens, credential JSON, runtime secrets, database URLs, or cloud credentials.
2. Raw `event`, raw `payload`, raw `properties`, raw invalid payloads, or arbitrary request bodies.
3. `idempotency.key` values.
4. Payment PANs, customer/member/device identifiers, merchant-sensitive item/payment details, or raw entity identifiers as metric labels.
5. Arbitrary SQL text or LLM prompts/responses.

`DD-P5-S5` implements the local/test subset through optional injected sinks on the bounded runner:

| Runtime surface | Local/test evidence |
|---|---|
| Structured logs | `worker.job.started`, `worker.job.checkpointed`, `worker.job.completed`, `worker.job.failed`, `worker.job.retry_scheduled`, and `worker.job.dead_lettered`. |
| Counters | `data_dyna_worker_jobs_total` labelled by worker kind, source/producer scope, outcome, failure class, and reason code. |
| Checkpoint counter | `data_dyna_worker_checkpoints_total` labelled by worker kind and checkpointed outcome. |
| Duration histogram | `data_dyna_worker_duration_ms` for completed and failed attempts. |
| Lag histogram | `data_dyna_worker_lag_ms` computed from due `next_run_at` to claim time. |
| Probe | `npm run probe:observability` runs the existing runtime probe plus `scripts/probe-worker-observability.ts` for worker success, retry, checkpoint resume, and dead-letter diagnosis evidence. |

Production dashboards, paging policy, mature SLOs, incident-management process, vendor backend selection, and capacity planning remain residual. Local/test probes and tests are sufficient for P5 acceptance until a later production-ops pack owns those surfaces.

## Local/test worker runbook

Run the safe local/test worker evidence path:

```bash
npm run probe:observability
```

The worker probe uses in-memory job, log, and metric sinks. It requires no database, production observability backend, external service, bearer token, or real customer/payment data. Expected worker proof includes:

1. one completed projection job with `worker.job.started`, `worker.job.checkpointed`, and `worker.job.completed` logs;
2. one retry-scheduled job with `worker.job.failed` and `worker.job.retry_scheduled` logs;
3. one dead-lettered job with `worker.job.failed` and `worker.job.dead_lettered` logs;
4. `data_dyna_worker_jobs_total`, `data_dyna_worker_checkpoints_total`, `data_dyna_worker_duration_ms`, and `data_dyna_worker_lag_ms` records;
5. resume watermark evidence from `readWorkerResumeWatermark` after the successful checkpoint.

Safe SQL/query shapes for real local/test PostgreSQL inspection should stay bounded and parameterized:

```sql
-- Job state for one worker kind and tenant/source scope.
SELECT job_id, worker_kind, status, attempt_count, max_attempts, last_error_class, last_error_reason, next_run_at, updated_at
  FROM worker_jobs
 WHERE worker_kind = $1
   AND merchant_id IS NOT DISTINCT FROM $2
   AND store_id IS NOT DISTINCT FROM $3
   AND source = $4
 ORDER BY updated_at DESC
 LIMIT 50;

-- Dead-letter audit without raw payload dumps.
SELECT job_id, attempt_id, worker_kind, attempt_count, failure_class, reason_code, safe_diagnostic, next_operator_action, created_at
  FROM worker_dead_letters
 WHERE worker_kind = $1
 ORDER BY created_at DESC
 LIMIT 50;

-- Freshness/checkpoint resume evidence.
SELECT worker_kind, committed_watermark, output_summary, committed_job_id, committed_attempt_id, committed_at
  FROM worker_checkpoints
 WHERE worker_kind = $1
   AND merchant_id IS NOT DISTINCT FROM $2
   AND store_id IS NOT DISTINCT FROM $3
   AND source = $4
 LIMIT 1;
```

Replay/dead-letter handling rules:

1. Inspect only safe diagnostic fields, reason code, attempt count, worker kind, tenant/source scope, and checkpoint freshness.
2. Fix the underlying deterministic output, storage, contract, tenant-policy, or idempotency issue before re-enqueueing/retrying.
3. Preserve the same tenant/source/idempotency identity and bounded input watermark; do not rewrite facts, skip checkpoints, or bypass output idempotency.
4. Do not replay from dashboards, logs, raw payload dumps, arbitrary SQL mutation, Agent remediation, or merchant-sensitive values.
5. If replay guidance needs production paging, mature incident management, capacity planning, or cloud observability backend decisions, hand off to a later production-operations pack rather than claiming P5 completion.

## P6 read-only handoff surface

`docs/workers/p6-agent-runtime-handoff.md` is the S6 handoff packet. P6 may start only after durable worker evidence exists. The P5 handoff exposes bounded, tenant-scoped, read-only facts and freshness metadata for future `AgentContextBundle` preparation:

Allowed future read-only capabilities:

1. `read_worker_freshness` returns worker freshness, committed job/attempt ids, committed watermark, output summary, and committed time for one worker kind and tenant/source scope.
2. `read_projection_summary` returns bounded store-context counts and aggregate facts already persisted by projection workers.
3. `read_snapshot_summary` returns bounded store/metric/segment summaries and explicit merchant confirmations already persisted by snapshot workers.
4. `read_benchmark_opportunity_gaps` returns aggregate-only directional opportunity gaps and evidence refs from benchmark workers.
5. `read_evidence_records` returns deterministic evidence records and trajectory summaries when committed evidence freshness exists.
6. `read_dead_letter_diagnosis` returns redacted failure class, reason code, and next operator action for bounded worker diagnosis.
7. `build_agent_context_bundle` prepares `agent-context-bundle.v1` from deterministic facts and evidence refs without invoking a provider.

Forbidden P6 surfaces:

1. Arbitrary SQL, raw table scans, direct access to raw payloads, secrets, idempotency keys, or dead-letter payload dumps.
2. Direct mutation of Core facts, worker checkpoints, worker jobs, merchant decisions, menus, prices, coupons, customer messages, or evidence records.
3. Live Pi provider integration, model auth/profile rotation, Agent sessions, LLM calls, tool execution, provider fallback, or token/cost accounting inside P5.
4. Treating LLM output as facts, evidence, merchant decisions, or worker completion proof.

OpenClaw/Pi lessons are applied here as prepared context attempts, typed capabilities, durable run/freshness refs, bounded context handoff, explicit tool-policy seams, context-budget-aware summaries, and fail-closed ownership. They do not authorize live Agent runtime work in P5.

## Fail-closed rules

Stop and replan rather than continue if a later P5 slice would require:

1. A broker, cloud scheduler, production dashboard, paging policy, mature SLO, or incident process as a correctness prerequisite instead of residual operations work.
2. P6 Agent runtime, live Pi provider integration, model auth, LLM execution, or Agent sessions.
3. Silent data loss, checkpoint advancement after failed writes, non-idempotent reruns, arbitrary SQL capabilities, or Agent direct mutation of facts.
4. Bypassing P2 tenant identity, P3 redaction/observability rules, or accepted P4 producer idempotency evidence.
5. Exactly-once claims without strict design and tests.

## Validation ladder

For contract-only/documentation slices:

```bash
npm run test:app:workers
npm run check:plan
git diff --check
```

For later P5 implementation slices, escalate only when the slice owns those surfaces:

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
