# Data Dyna Agent Runtime Boundary Contract

Status: `DD-P6-S1` contract artifact. This document selects the P6 Agent boundary-manager shape before provider/runtime implementation. It is not a live provider integration, credential rollout, production deployment plan, dashboard, paging policy, SLO, incident process, or Agent runtime execution proof.

## Decision

Data Dyna will use one OpenClaw-like Agent attempt boundary:

```ts
runAgentAttempt({ preparedAttempt, prompt, tools, policy, runtime, audit })
```

Data Dyna owns the boundary. The LLM/harness owns the turn flow inside that boundary.

| Owner | Owns | Must not own |
|---|---|---|
| Data Dyna host | tenant identity, prepared attempt, worker freshness, context budget, tool catalog, runtime/provider/model/profile/auth selection, policy gates, audit, redaction, result schemas, deterministic validator gate, merchant-review gate, fail-closed behavior | query/reason/draft order once the prepared attempt is handed to the harness |
| LLM/harness | choosing which allowed read tools to call, deciding what returned evidence to reason over, deciding when to emit a draft artifact | direct Core writes, business mutation, evidence promotion, merchant decision, raw data access, policy override, runtime fallback |

Validation and merchant review are result gates. They are not a hidden server-managed business reasoning pipeline.

## Selected runtime/harness path

The selected path is a single Data Dyna Agent attempt harness with Pi/OpenClaw-like semantics:

1. Host prepares `preparedAttempt` from committed deterministic worker outputs and freshness refs.
2. Host builds `prompt`, `tools`, `policy`, `runtime`, and `audit` inputs.
3. Host calls `runAgentAttempt({ preparedAttempt, prompt, tools, policy, runtime, audit })` only after all policy and runtime gates pass.
4. The harness gives the LLM a tool-governed turn loop. The server does not hardcode `read summary -> draft -> validate -> submit`, does not preselect the full reasoning transcript, and does not call a static draft function as the production flow.
5. The host parses the draft result, records audit, then applies deterministic validator and merchant-review gates before any review handoff request is accepted.

Missing or ambiguous provider, model, profile, auth, prompt, tool catalog, tool policy, prepared attempt, or audit store fails closed with audit evidence. There is no provider fallback, model fallback, runtime fallback, fixture fallback, relaxed-policy fallback, or architecture-iteration fallback.

Local/test doubles may exist only in tests around this selected boundary. They must not be reachable production fallback paths.

## Prepared attempt contract

`preparedAgentAttempt` is the only input shape allowed to cross from deterministic context preparation into Agent runtime invocation.

| Field | Contract | Gate |
|---|---|---|
| `attemptId` | stable prepared-attempt id | required before runtime invocation |
| `agentRunId`, `sessionId` | run/session audit ids | required and host generated |
| `brandId`, `storeId`, `opportunityGapId` | tenant/store/opportunity identity | resolved from accepted deterministic identity, never free-form Agent input |
| `requestedBy`, `createdAt` | actor/time audit | required |
| `contextBundleVersion` | `agent-context-bundle.v1` until a later accepted migration | exact match required |
| `workerFreshnessRefs[]` | committed worker freshness refs | required for projection, snapshot, benchmark, and evidence where needed |
| `contextSeed` | bounded seed/index for the LLM | ids, counts, dates, metric ids, confidence, sample status, assumptions, evidence refs, and pointers only; no raw payload |
| `contextBudget` | max seed/tool-result budget | fail closed on overflow; do not ask the model to summarize raw or secret data |
| `toolCatalogVersion` | selected tool catalog | default deny unless exact policy version matches |
| `forbiddenCapabilities[]` | explicit deny list | must include all forbidden capability families in this contract |
| `status` | `prepared`, `blocked_missing_freshness`, `blocked_stale_freshness`, `blocked_dead_letter`, `blocked_tenant_mismatch`, `blocked_policy`, `consumed_by_agent_runtime` | only `prepared` may be consumed by runtime |
| `failureReason` | safe reason for blocked attempts | redacted; no secrets, raw payloads, stack dumps, or merchant-sensitive detail |

The prepared attempt supplies a context seed/index plus read-only tools. It must not be a full server-selected reasoning transcript.

## Worker freshness refs

Every Agent attempt that depends on worker output must carry auditable freshness refs.

| Worker kind | Ref fields | Runtime use | Fail-closed condition |
|---|---|---|---|
| `projection` | worker kind, committed job id, committed attempt id, committed watermark, committed at, tenant/source scope, count-only output summary | store-context counts and aggregate facts | missing, stale, dead-lettered, tenant/source mismatch, or over budget |
| `snapshot` | worker kind, committed job id, committed attempt id, snapshot date, committed watermark, committed at, count-only output summary | store profile, metric, segment, and merchant-confirmation context | missing, stale, dead-lettered, tenant/source mismatch, or inferred merchant confirmation |
| `benchmark` | worker kind, committed job id, committed attempt id, committed watermark, committed at, aggregate-only output summary | directional opportunity gaps and evidence refs | missing, stale, dead-lettered, tenant/source mismatch, peer-store identity, or non-aggregate peer data |
| `evidence` | worker kind, committed job id, committed attempt id, committed watermark, committed evidence ids/counts, verdict summary | deterministic evidence records and trajectory summaries | missing, stale, dead-lettered, tenant/source mismatch, or LLM-authored evidence promotion |
| dead-letter status | job id, attempt count, failure class, safe reason code, next operator action | block unsafe attempt preparation and support operator repair | raw stack trace, raw payload, secret, or automatic replay/remediation request |

## P5 handoff to P6 read-only capabilities

P6 consumes the accepted P5 handoff through read-only capabilities only.

| P5 handoff capability | P6 boundary name | Allowed output | Denied authority |
|---|---|---|---|
| committed worker freshness | `read_worker_freshness` | committed job/attempt/watermark/summary status | worker enqueue, claim, heartbeat, checkpoint, complete, retry, dead-letter, replay, cancel, or backfill mutation |
| projection summaries | `read_projection_summary` | bounded store-context counts and aggregate facts | arbitrary SQL, raw event payloads, bearer tokens, idempotency keys, payment PANs, customer/member/device identifiers |
| snapshot summaries | `read_snapshot_summary` | profile, metrics, explicit merchant confirmations, count-only summaries | inferred merchant confirmation or raw payload reads |
| benchmark gaps | `read_benchmark_opportunity_gaps` | aggregate peer benchmark facts, opportunity gap facts, evidence refs | peer-store identity, non-aggregate peer samples, causal claims |
| evidence records | `read_evidence_records` | deterministic evidence records and trajectory summaries | LLM-authored evidence facts or direct evidence promotion |
| deterministic bundle construction | `build_agent_context_seed` | bounded context seed/index and refs | provider calls, Core writes, business mutations |
| dead-letter diagnosis | `read_dead_letter_diagnosis` | redacted failure class, reason code, next operator action | raw stack traces, raw payloads, secrets, automatic remediation |

These names are contract names for future P6 implementation. S1 does not implement runtime tools.

## Tool policy lifecycle

Tool policy is default deny and versioned.

1. Before tool registration, Data Dyna evaluates the requested catalog against tenant identity, prepared attempt status, worker freshness refs, forbidden capabilities, and mutation policy.
2. Before each tool call, Data Dyna checks tool name, input scope, freshness refs, context budget, and policy version.
3. Before tool results return to the LLM, Data Dyna redacts and bounds results, then records audit.
4. Provider/model output cannot add tools, rename tools, relax policy, override freshness, or request mutation authority.
5. A denied tool decision prevents tool execution and records safe audit evidence.

Allowed tool classes are read context, draft artifact creation, deterministic validation request, and merchant-review handoff request. Only read-context tools may inspect deterministic worker outputs. Draft, validation, and review-request tools do not mutate Core or business state.

## Forbidden capabilities

The Agent runtime must not receive, synthesize, or infer these capabilities:

1. `arbitrary_sql` or arbitrary database query execution.
2. `raw_payload_read`, raw event/body/properties reads, invalid payload dumps, raw stack traces, or unbounded history scans.
3. `secret_read`, bearer tokens, idempotency keys, database URLs, cloud credentials, provider keys, model auth, Pi profile secrets, or credential JSON.
4. Worker mutation tools: enqueue, claim, heartbeat, checkpoint, complete, retry, dead-letter, replay, cancel, or backfill execution.
5. Core writes: orders, metrics, benchmarks, `evidence_facts`, business configs, raw event rewriting, checkpoint rewriting, or job-state mutation.
6. Direct business mutations: menu, price, coupon, customer message execution, payment, refund, order action, merchant configuration, or POS write.
7. Evidence promotion: treating LLM output as fact, evidence, adoption record, or deterministic merchant signal.
8. Merchant decision authority: treating Agent output or review handoff as merchant approval.
9. Runtime fallback authority: fixture fallback, provider fallback, model fallback, alternate runtime fallback, relaxed-policy fallback, old alias fallback, or architecture-iteration fallback.

Forbidden means fail closed. A future request for one of these surfaces requires a new accepted plan and proof; it is not part of P6 S1.

## Runtime policy gates

| Gate | Pass condition | Failure behavior |
|---|---|---|
| identity | deterministic `brandId`, `storeId`, `opportunityGapId`, `agentRunId`, and `sessionId` exist | block prepared attempt or runtime invocation |
| freshness | required worker freshness refs are committed, current enough for the opportunity, and tenant/source matched | `blocked_missing_freshness`, `blocked_stale_freshness`, `blocked_dead_letter`, or `blocked_tenant_mismatch` |
| context budget | seed and tool-result budget are bounded before provider call | `blocked_policy`; no model summarization of raw data |
| tool policy | exact tool catalog and policy version passes default-deny evaluation | no tool registration and no harness invocation |
| runtime selection | one provider/model/profile/runtime/auth path is selected and unambiguous | fail closed; no fallback provider/model/runtime/fixture |
| audit | audit store and prompt ref are available | fail closed; no unaudited Agent run |
| redaction | inputs/results/events pass redaction and bounded-output checks | deny result or block run with safe reason |
| result schema | LLM output parses as draft-only result | validator rejection; no evidence or business action |
| merchant review | deterministic validator accepts draft and review request is explicit | no review handoff request |

## Session/run audit contract

Audit records must be sufficient to reconstruct the run boundary without chat memory.

Required fields:

- `agentRunId`, `sessionId`, `attemptId`, `brandId`, `storeId`, `opportunityGapId`.
- `contextBundleVersion`, context seed hash, context budget, evidence refs, worker freshness refs.
- prompt ref, tool catalog version, tool policy version, selected runtime, provider, model, profile, and auth source id or safe redacted auth reference.
- lifecycle events: attempt prepared, policy evaluated, runtime selected, harness invoked, tool call attempted, tool call denied, tool result returned, draft captured, validator accepted/rejected, merchant-review request accepted/rejected, run failed.
- safe failure reason, latency/cost fields when available, and redaction status.

Audit must not persist provider keys, bearer tokens, database URLs, raw payloads, raw stack traces, customer/payment identifiers, or merchant-sensitive free text.

## Result boundary, validator gate, and merchant-review gate

The only acceptable Agent output is an untrusted draft artifact with `truthStatus = agent_draft_not_core_truth` and `requestedCoreWrites = []`.

A draft may proceed only through this boundary sequence:

1. Parse against the P6 result schema.
2. Confirm evidence refs came from the prepared attempt or deterministic read tools.
3. Run deterministic experiment-plan validator.
4. If the validator accepts, create a merchant-review handoff request.
5. Preserve merchant-review as a request for human review, not merchant approval and not business execution.

LLM output never becomes Core truth, evidence fact, merchant decision, or business action.

## Obsolete surfaces to remove or replace in later P6 slices

These current surfaces are not sacred compatibility surfaces:

| Surface | Current role | Owning P6 slice |
|---|---|---|
| `AgentRuntimeAdapter.draft(...)` and production-shaped `adapter.draft(context)` flow | static draft-function runtime shape | replace/delete in `DD-P6-S3` |
| `createFixtureAgentRuntimeAdapter` / `fixture_adapter` runtime mode | fixture-only draft path | keep only as test double around selected boundary or delete in `DD-P6-S3`/`DD-P6-S6` |
| server-managed draft helpers that imply `read summary -> draft -> validate -> submit` | hidden business-flow orchestration risk | delete or replace by result gates in `DD-P6-S5` |
| compatibility runtime aliases, old tool aliases, dual-stack adapters, relaxed-policy branches | fallback/compatibility risk | remove in owning implementation slice; prove deletion in `DD-P6-S6` |
| static full-context packing that preselects a reasoning transcript | over-constrains LLM into template filling | replace with prepared attempt seed/index in `DD-P6-S2` |

Deletion rule: once a P6 slice supersedes a surface, remove it rather than wrapping it for compatibility.

## Residuals and non-goals

S1 does not require live provider credentials, live LLM calls, cloud deployment, production dashboarding, paging, mature SLOs, incident process, provider cost guarantees, model failover, production secrets rollout, capacity planning, backup/restore, or exactly-once claims.

S1 also does not implement prepared attempt persistence, runtime tool execution, provider/model calls, validator orchestration, merchant-review persistence, or deletion of existing fixture code. Those are owned by later P6 slices.
