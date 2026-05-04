# Data Dyna P6 Agent Runtime Handoff

Status: `DD-P5-S6` execute evidence. This is a P5 handoff packet for future P6 work; it is not a live Agent runtime, Pi provider integration, model-auth setup, production dashboard, paging policy, mature SLO, incident-management process, or production deployment plan.

## Purpose

P5 gives P6 a durable, tenant-scoped, evidence-first context boundary. P6 should start from accepted worker outputs and freshness metadata rather than scanning raw worker internals, reading unbounded raw event history, or trusting LLM memory.

```text
accepted raw_events
  -> durable projection worker output + freshness
  -> durable snapshot worker output + freshness
  -> durable benchmark worker output + freshness
  -> durable evidence worker output + freshness
  -> P6 read-only AgentContextBundle preparation
  -> future P6 Agent runtime / Pi provider / merchant-review gates
```

P5 owns the handoff contract only. P6 still owns live Agent sessions, provider/runtime selection, tool policy enforcement at runtime, validator and merchant-review orchestration, provider cost/failure audit, and no-direct-mutation tests.

## Durable outputs P6 may consume

P6 may consume only bounded, tenant-scoped, deterministic outputs that have committed worker freshness. Each read must be scoped by the future Agent run identity (`brandId`, `storeId`, `opportunityGapId`, and `agentRunId` or an equivalent prepared-attempt id) and by the worker freshness watermark.

| Worker output | P6 use | Required freshness evidence | Boundaries |
|---|---|---|---|
| Projection summaries | Build store context summaries such as sessions/carts/orders/payments/refunds/member aggregates. | `readFreshness("projection", tenantScope, sourceScope)` with committed job id, attempt id, committed watermark, output summary, and committed time. | No raw payloads, bearer tokens, idempotency keys, payment PANs, customer/member/device identifiers, or arbitrary SQL. |
| Snapshot summaries | Build store profile, metric, segment, and merchant-confirmation context. | `readFreshness("snapshot", tenantScope, sourceScope)` plus snapshot date and count-only output summary. | Segment confirmation must come from explicit merchant confirmation, not Agent inference. |
| Benchmark opportunity gaps | Feed `AgentContextBundle.facts.opportunityGap` and evidence refs. | `readFreshness("benchmark", tenantScope, sourceScope)` plus aggregate-only peer benchmark/output summary. | Peer store ids and non-aggregate peer data remain forbidden. Gaps are directional and non-causal. |
| Evidence records | Feed read-only historical trajectory and evidence refs when available. | `readFreshness("evidence", tenantScope, sourceScope)` plus committed evidence ids/counts and verdict summary. | LLM output is never evidence fact. Evidence requires deterministic records and merchant/adoption lifecycle inputs. |
| Worker job/dead-letter status | Let operators decide whether a context attempt is safe to prepare or must fail closed. | Job status, attempt count, failure class, safe reason code, and next operator action. | Dead-letter diagnostics stay redacted; no raw stack traces, raw payloads, secrets, or merchant-sensitive details. |

If required worker freshness is missing, stale, dead-lettered, or tenant/source mismatched, P6 must fail closed and request deterministic repair or operator review before preparing an Agent context.

## Prepared context attempt

P6 should introduce a prepared context attempt before invoking any Agent runtime. P5 recommends this shape; P5 does not create the table, scheduler, or live runtime.

```text
prepared_agent_context_attempt
  attempt_id
  agent_run_id
  session_id
  brand_id
  store_id
  opportunity_gap_id
  requested_by
  created_at
  context_bundle_version = agent-context-bundle.v1
  worker_freshness_refs[] = [worker_kind, committed_job_id, committed_attempt_id, committed_watermark, committed_at]
  evidence_refs[]
  allowed_read_capabilities[]
  forbidden_capabilities[]
  context_budget
  status = prepared | blocked_missing_freshness | blocked_policy | consumed_by_agent_runtime
```

Preparation rules:

1. Resolve tenant and store scope from accepted P2/P4 identity, never from free-form Agent input.
2. Read only committed worker freshness and deterministic output summaries.
3. Build an `AgentContextBundle` through the project schema with `contractVersion = agent-context-bundle.v1`.
4. Preserve `evidenceRefs` from deterministic opportunity gaps/evidence records; do not let an LLM invent evidence refs.
5. Carry bounded assumptions such as `Peer benchmark comparison is directional and non-causal.`
6. Record the exact worker freshness refs used so an Agent run can be audited without chat-memory reconstruction.
7. Fail closed when worker outputs are missing, stale, dead-lettered, tenant-mismatched, or over budget.

## Allowed read-only capabilities for P6

P6 may expose typed read capabilities to context preparation code. Names are contract names, not implemented P5 runtime tools.

| Capability | Input boundary | Output boundary | Mutation policy |
|---|---|---|---|
| `read_worker_freshness` | Worker kind, tenant scope, source scope. | `WorkerFreshnessRecord` with committed watermark and count-only summary. | Read-only; no job state mutation. |
| `read_projection_summary` | Tenant/source scope plus committed projection freshness ref. | Bounded store-context counts and aggregate facts. | Read-only; no raw event payload access. |
| `read_snapshot_summary` | Brand/store/date plus committed snapshot freshness ref. | Store profile, metrics, segment candidates, explicit confirmations. | Read-only; no inferred merchant confirmation. |
| `read_benchmark_opportunity_gaps` | Brand/store/date/opportunity id plus committed benchmark freshness ref. | Aggregate opportunity gap facts and evidence refs. | Read-only; no peer-store identity exposure. |
| `read_evidence_records` | Opportunity/evidence refs plus committed evidence freshness ref. | Deterministic evidence records and trajectory summaries. | Read-only; no LLM-authored evidence promotion. |
| `build_agent_context_bundle` | Bounded deterministic facts, evidence refs, assumptions, allowlists. | `AgentContextBundle` for future Agent runtime input. | Pure preparation; no provider call and no Core/business write. |
| `read_dead_letter_diagnosis` | Job id or tenant/worker bounded filter. | Redacted failure class, reason code, next operator action. | Read-only; no automatic remediation or replay mutation. |

All future runtime tool descriptors must keep `mutationPolicy = no_core_or_business_mutation` unless a later accepted pack explicitly proves a narrower safe mutation surface. P5 does not grant one.

## Forbidden capabilities

P6 must not receive or synthesize these capabilities from the P5 handoff:

1. `arbitrary_sql` or arbitrary database query execution.
2. `raw_payload_read`, raw `event`, raw `payload`, raw `properties`, invalid payload dumps, request bodies, or raw stack traces.
3. `secret_read`, bearer tokens, credential JSON, database URLs, cloud credentials, provider keys, model auth, or Pi profile secrets.
4. Direct Core writes: `orders`, `metrics`, `benchmarks`, `evidence_facts`, `business_configs`, raw event rewriting, checkpoint rewriting, or job state mutation.
5. Direct business mutations: `menu`, `price`, `coupon`, `customer_message_execution`, payment/refund/order actions, or merchant configuration changes.
6. Agent runtime control: live Pi provider calls, model failover, production runtime selection, Agent session creation, prompt execution, or sidecar deployment.
7. Worker mutation tools: enqueue, claim, heartbeat, checkpoint, complete, retry, dead-letter, replay, cancel, or backfill execution.
8. Treating LLM output as fact, evidence, merchant decision, or completed business action.

Forbidden means fail closed. If a future Agent request needs one of these surfaces, it belongs to a future P6/P7 plan with new proof, not this P5 foundation.

## Context budget and compaction

P6 context preparation should budget deterministic context before any provider call:

1. Prefer ids, counts, dates, metric ids, confidence, sample status, and evidence refs over raw rows.
2. Include at most one selected opportunity gap unless a future validator accepts a multi-gap bundle.
3. Include aggregate peer benchmark values only; never peer store ids or non-aggregate peer samples.
4. Include evidence summaries only when they cite committed evidence records.
5. Include worker freshness refs for audit instead of embedding raw worker internals.
6. If the context exceeds budget, prune lower-priority summaries deterministically or block with `blocked_policy`; do not ask the model to summarize secrets or raw payloads.

## Runtime ownership and audit handoff

OpenClaw/Pi patterns should influence P6 as ownership boundaries, not as P5 runtime implementation:

1. Prepared attempts separate deterministic context construction from Agent runtime invocation.
2. Tool allowlists must be resolved before provider calls and default to deny.
3. Runtime selection must fail closed if provider, model, profile, auth, or policy is missing or ambiguous.
4. Session/run audit must link `agentRunId`, `sessionId`, `brandId`, `storeId`, `opportunityGapId`, `context_bundle_version`, context hash, prompt ref, worker freshness refs, tool policy version, provider/model metadata, and lifecycle events.
5. The future Agent run may create drafts only: `truthStatus = agent_draft_not_core_truth` and `requestedCoreWrites = []`.
6. Deterministic validator and merchant-review gates remain required before any business action is considered.

## Residual map

P6 still owns:

1. Live Pi provider integration, model auth/profile rotation, model failover, provider/runtime selection, and Agent session lifecycle.
2. Agent run storage beyond the existing local/test foundation, including prepared context attempt persistence if accepted by P6.
3. Runtime tool-policy enforcement, tool descriptor registration, tool call audit, and fail-closed provider policy.
4. Deterministic validator orchestration, merchant-review gates, draft lifecycle, provider failure/cost audit, and no-direct-mutation tests.
5. Production Agent deployment, secrets, rollback, and operational ownership.

Production operations still own:

1. Production dashboarding, paging, mature SLOs, incident management, cloud observability backend selection, and capacity planning.
2. Cloud secret management, deployment hardening, rollout/rollback, backup/restore, and compliance operations.
3. Production scheduler/output repositories and exactly-once semantics beyond the tested durable/idempotent guarantees.

P5 is complete only when this handoff is accepted together with the durable worker schema/repository, bounded executors, retry/dead-letter proof, observability/probe/runbook evidence, and closeout audit. This document must not be used to skip the future P6 concrete pack.
