# Data Dyna Agent Sidecar / Harness v1

`DD-P3-S1` originally added the Agent sidecar foundation. `DD-P6-S3` replaces the production-shaped `adapter.draft(context)` model with the selected P6 harness boundary:

```ts
runAgentAttempt({ preparedAttempt, prompt, tools, policy, runtime, audit })
```

This document describes the current boundary. It does not claim live provider rollout, production deployment, merchant approval, evidence promotion, or business mutation execution.

## Boundary

Data Core owns deterministic facts:

- raw events;
- projections;
- independent-café snapshots;
- peer benchmarks;
- opportunity gaps;
- evidence facts.

The Agent may consume only a prepared attempt and bounded read-only tools. It may return an `intervention_hypothesis_draft`. The draft is an untrusted artifact for later deterministic validation and merchant-review request gating; it is not Core truth, evidence fact, merchant approval, or business action.

Required draft invariants:

```text
truthStatus = agent_draft_not_core_truth
requestedCoreWrites = []
```

## Prepared attempt and context seed

`src/agent/prepared-attempt.ts` defines the `DD-P6-S2` prepared-attempt boundary:

- identity: `attemptId`, `agentRunId`, `sessionId`, `brandId`, `storeId`, `opportunityGapId`;
- source: deterministic tenant scope only, never free-form Agent input;
- worker freshness refs: projection, snapshot, benchmark, evidence;
- bounded `contextSeed` and `contextSeedHash`;
- `toolCatalogVersion = agent-read-tools.v1`;
- forbidden capabilities such as arbitrary SQL, raw payload read, secret read, worker mutation, Core write, business mutation, evidence promotion, merchant decision authority, and runtime fallback authority.

Blocked attempts may expose only safe dead-letter diagnosis. Summary tools require a `prepared` attempt.

## Runtime model

`src/agent/agent-sidecar.ts` owns the selected `DD-P6-S3` harness boundary:

```text
prepared attempt
  + prompt ref / system instructions
  + read-only tools
  + accepted runtime policy
  + selected provider/model/profile/runtime/auth ref
  + audit store
  + audit/transcript callbacks
  -> runAgentAttempt
  -> harness-owned tool turn
  -> draft capture or fail-closed audit
```

The server does not call a static draft function and does not hardcode `read summary -> draft -> validate -> submit`. The selected runtime/harness receives a policy-wrapped runtime tool surface and owns tool-call order and draft timing.

Missing or ambiguous prepared attempt, prompt, policy, tool surface, provider, model, profile, runtime, auth ref, audit store, or harness callbacks blocks invocation. Unregistered tool surfaces such as arbitrary SQL or compatibility aliases are rejected before harness invocation. Known but non-allowed read tools are denied before underlying tool execution. There is no fixture fallback, provider fallback, model fallback, alternate runtime fallback, relaxed-policy fallback, or legacy adapter fallback.

Local/test harness doubles are allowed only as selected runtimes inside tests. They are not production fallback paths.

## Audit schema

`migrations/0005_agent_runs.sql` creates:

- `agent_runs`: one row per Agent attempt, including attempt id, provider/model/profile/runtime/auth ref, prompt ref, context seed hash, tool catalog version, tool policy version, draft JSON, error message, and evidence refs;
- `agent_run_events`: append-only lifecycle events such as `run_started`, `attempt_loaded`, `policy_evaluated`, `runtime_selected`, `harness_invoked`, `tool_call_attempt`, `tool_call_denied`, `tool_result_sanitized`, `harness_transcript_event`, `draft_captured`, `draft_validation_evaluated`, `merchant_review_requested`, and `run_failed`.

SQL checks keep captured drafts from becoming Core truth by requiring:

- `context_bundle_version = 'agent-context-bundle.v1'`;
- `draft->>'truthStatus' = 'agent_draft_not_core_truth'`;
- `requestedCoreWrites` length is zero.

`src/agent/result-boundary.ts` owns the `DD-P6-S5` result gate. It parses the captured draft into deterministic hypothesis and experiment-plan artifacts, runs `validateExperimentPlan`, records `draft_validation_evaluated`, and only then allows an explicit merchant-review request that records `merchant_review_requested`. `runAgentAttempt` itself does not auto-submit merchant review.

Audit must not persist provider keys, bearer tokens, database URLs, raw payloads, raw stack traces, customer/payment identifiers, or merchant-sensitive free text.

`DD-P6-S6` adds the local/test observability proof in `src/agent/observability.ts`, `scripts/probe-agent-runtime-observability.ts`, `docs/agent/agent-runtime-observability-runbook.md`, and `docs/agent/agent-runtime-deletion-audit.md`. The probe summarizes audit-event coverage, local metric counters, latency, optional runtime usage/cost metadata, validator/review outcomes, provider/runtime failure redaction, and production deletion proof without requiring production dashboards or live providers.

## Local validation

Current local/test proof validates:

- context bundle serialization and mutation-target boundaries;
- prepared attempt worker freshness, tenant/source, dead-letter, and budget gates;
- successful selected local/test harness execution through `runAgentAttempt`;
- missing prompt/runtime/auth/model/profile/policy/callback/harness fail-closed behavior without harness invocation;
- provider/runtime failure audit with secret redaction;
- default-deny runtime tool policy, unregistered tool-surface rejection, per-call denial before underlying tool execution, immutable runtime policy against provider override, and bounded/redacted tool results;
- draft-only output with no Core writes;
- result-boundary parsing/validation before merchant-review request, invalid/missing-evidence/forbidden-mutation fail-closed behavior, and no automatic review submission from the harness turn;
- Agent runtime observability probe coverage for success, denied tool call, provider/runtime failure, validator rejection, review handoff request, latency/usage metadata, and redaction-safe bounded summaries;
- deletion of obsolete production code surfaces named `adapter.draft`, `AgentRuntimeAdapter`, `createFixtureAgentRuntimeAdapter`, `fixture_adapter`, `draftFixtureExperimentPlanFromContext`, and `submit_for_merchant_review` from production Agent code.

Run:

```bash
npm run test:agent
npm run probe:observability
npm run check:boundaries
npm run typecheck
```
