# Data Dyna Agent Runtime Observability Runbook

Status: `DD-P6-S6` local/test runbook. This is not a production dashboard, paging policy, SLO, incident process, provider credential rollout, or cloud secret hardening plan.

## Scope

The Agent runtime boundary is observable through safe audit events plus local/test probe summaries. The proof path uses selected local/test runtimes and in-memory audit stores only; it does not call live providers or production services.

Covered signals:

1. prepared attempt loaded and worker freshness refs counted;
2. runtime policy evaluated with bounded allowed tools and `no_core_or_business_mutation`;
3. selected provider/model/profile/runtime/auth ref recorded as safe refs only;
4. harness invocation, tool call attempts, denied tool calls, and sanitized tool results;
5. draft capture, validator accept/block outcomes, and explicit merchant-review request handoff;
6. provider/runtime failure with redacted safe reason;
7. latency fields and provider usage/cost metadata when the selected runtime returns them;
8. deletion proof for removed compatibility/fallback/flow-manager surfaces.

## Local/test probe

Run from the repository root:

```bash
npm run probe:observability
```

The Agent portion runs `scripts/probe-agent-runtime-observability.ts`. It demonstrates:

1. a successful selected harness turn with runtime token/cost metadata;
2. an allowed read-tool path with sanitized tool-result audit;
3. a denied tool call before the underlying read tool executes;
4. provider/runtime failure with secret/raw-payload/customer/payment redaction;
5. deterministic validator rejection for invented evidence;
6. explicit merchant-review request after an accepted result gate;
7. no production fallback by scanning removed Agent compatibility surfaces.

Expected Agent output starts with:

```text
Agent runtime observability probe passed:
```

The printed JSON summary is bounded and contains counts/booleans only: audit event counts, coverage booleans, local metric counters, latency, optional runtime usage, deletion-proof counts, and residual notes. It intentionally omits provider keys, bearer tokens, prompts, raw payloads, customer/payment identifiers, merchant-sensitive recommendation text, and high-cardinality tenant details.

## Safe query shapes

Use these local/test questions and fields when triaging Agent runtime behavior:

| Question | Local/test signal | Expected field shape |
|---|---|---|
| Did an attempt start and load prepared context? | `run_started`, `attempt_loaded` | count only plus freshness ref count; no raw context payload |
| Was the runtime policy evaluated? | `policy_evaluated` | policy version, tool catalog version, mutation policy, allowed tool names, forbidden capability names |
| Did the harness run? | `harness_invoked` | runtime mode, allowed tool count, policy version |
| Which tools were attempted or denied? | `tool_call_attempt`, `tool_call_denied` | tool name, policy version, bounded reason code |
| Were tool results safe to return? | `tool_result_sanitized` | tool name and sanitized byte count only |
| Was a draft captured? | `draft_captured` | truth status, evidence-ref count, requested Core-write count, latency, optional usage/cost metadata |
| Did validation accept or block? | `draft_validation_evaluated` | decision, reason codes, evidence-ref count, truth status |
| Was review requested? | `merchant_review_requested` | review status/lifecycle, evidence-ref count, `merchantApprovalImplied=false`, `businessMutationCalled=false` |
| Did provider/runtime fail? | `run_failed` | redacted error message and latency only |

## Redaction and boundedness rules

Agent observability must not emit:

1. provider keys, bearer tokens, model auth values, credential JSON, database URLs, private keys, or cloud secrets;
2. raw prompts containing sensitive payloads;
3. raw tool payloads, raw event payloads, raw stack traces, or unbounded provider payloads;
4. customer/member/device identifiers, payment ids, card numbers, phone numbers, idempotency keys, or merchant-sensitive free-text details;
5. fallback options such as fixture fallback, provider fallback, model fallback, relaxed policy, or legacy adapter aliases.

`src/agent/observability.ts` enforces a bounded local/test report size and fails if the summary contains secret/raw-payload/customer/payment patterns. `src/agent/agent-sidecar.ts` redacts provider/runtime errors and tool/transcript summaries before audit persistence.

## Failure triage

1. `tool_call_denied` present and no draft captured: inspect `metadata.reason`; do not broaden allowlists unless a future accepted slice changes policy.
2. `run_failed` after `harness_invoked`: inspect the redacted reason and selected runtime refs; do not fall back to fixture/provider/model alternatives.
3. `draft_validation_evaluated.decision = block`: inspect deterministic `reasonCodes`; do not let the Agent rewrite Core facts or evidence refs.
4. Missing `merchant_review_requested`: confirm validator acceptance first; review handoff must remain explicit and must not imply approval.
5. Deletion proof failure: remove the production compatibility surface or route to replan if the surface is intentionally reintroduced.

## Residual operations

Production dashboards, SLO thresholds, paging, incident response, cloud secret rollout, deployment hardening, provider cost governance, and capacity planning remain residual operations maturity. They are not prerequisites for local/test correctness in `DD-P6-S6`.
