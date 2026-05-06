# agent

## Owns
- Agent context bundles, safe tool policy, prepared attempts, selected Agent harness boundary, draft artifacts, deterministic validator gate, and local/test Agent runtime observability proof.

## P6 boundary contract
- The active P6 runtime boundary contract is `docs/agent/agent-runtime-boundary-contract.md`.
- The selected production shape is `runAgentAttempt({ preparedAttempt, prompt, tools, policy, runtime, audit })`: Data Dyna owns boundaries/policy/audit/result gates while the LLM owns the tool-governed query/reason/draft turn.
- `src/agent/prepared-attempt.ts` owns the `DD-P6-S2` local/test prepared-attempt seed and read-only tool-boundary proof; it records worker freshness refs, context seed hash, context budget, tool catalog version, forbidden capabilities, blocked/prepared status, and safe failure reasons without provider calls or Worker/Core mutations.
- `src/agent/agent-sidecar.ts` owns the `DD-P6-S3` selected harness boundary and `DD-P6-S4` runtime tool-boundary proof: `runAgentAttempt` accepts prepared attempt, prompt, read-only tools, accepted policy, selected provider/model/profile/runtime/auth ref, audit store, and harness callbacks; it rejects unregistered tool surfaces before harness invocation and wraps each runtime tool call with default-deny policy, audit, bounded sanitized results, and fail-closed behavior.
- `src/agent/agent-tools.ts` is aligned to the P6 prepared read-only tool names; old P3 draft/validate/submit tool names are not active safe-policy aliases.
- `src/agent/result-boundary.ts` owns the `DD-P6-S5` result gate: captured Agent drafts are parsed into deterministic hypothesis/experiment-plan artifacts, validated, and only then may request merchant review with audit evidence; no merchant approval or business mutation is implied.
- `src/agent/observability.ts` and `scripts/probe-agent-runtime-observability.ts` own the `DD-P6-S6` local/test observability and deletion-proof summary for Agent success, tool denial, provider/runtime failure, validator rejection, review handoff, latency/usage metadata, and redaction-safe bounded output.
- Former fixture sidecar, static fixture draft helpers, and `adapter.draft(...)` production-shaped surfaces were pre-P6 raw material and have been removed from Agent production code; local/test harness doubles and test plan fixtures live under `tests/**` only.

## Inputs
- Directional opportunity gaps, aggregate evidence refs, allowed draft operations, and draft hypothesis/plan payloads.

## Outputs
- Agent run audit records, draft hypotheses/plans, safe tool policy decisions, validation results, merchant-review request handoffs, and bounded local/test observability reports.

## Allowed imports
- Contracts plus snapshot/benchmark facts needed to build context; local Agent modules may import each other.

## Forbidden
- Do not import ingestion stores or projection rebuild internals.
- Do not add tools that mutate orders, metrics, benchmarks, evidence facts, business configs, menus, prices, coupons, or customer messages.
- Do not promote Agent output to Core truth; drafts must pass the validator before merchant review.

## Validation
- Run `npm run test:agent`, `npm run probe:observability`, `npm run check:boundaries`, and `npm run typecheck`.
