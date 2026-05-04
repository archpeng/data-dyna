# agent

## Owns
- Agent context bundles, safe tool policy, fixture sidecar adapter, experiment plan drafts, and deterministic validator gate.

## P6 boundary contract
- The active P6 runtime boundary contract is `docs/agent/agent-runtime-boundary-contract.md`.
- The selected production shape is `runAgentAttempt({ preparedAttempt, prompt, tools, policy, runtime, audit })`: Data Dyna owns boundaries/policy/audit/result gates while the LLM owns the tool-governed query/reason/draft turn.
- Existing fixture sidecar and `adapter.draft(...)`-style draft surfaces are pre-P6 raw material, not compatibility surfaces or fallback runtime paths; later P6 slices must replace/delete them when the selected boundary owns behavior.
- `src/agent/prepared-attempt.ts` owns the current `DD-P6-S2` local/test prepared-attempt seed and read-only tool-boundary proof; it records worker freshness refs, context seed hash, context budget, tool catalog version, forbidden capabilities, blocked/prepared status, and safe failure reasons without provider calls or Worker/Core mutations.

## Inputs
- Directional opportunity gaps, aggregate evidence refs, allowed draft operations, and draft hypothesis/plan payloads.

## Outputs
- Agent run audit records, draft hypotheses/plans, safe tool policy decisions, and validation results.

## Allowed imports
- Contracts plus snapshot/benchmark facts needed to build context; local Agent modules may import each other.

## Forbidden
- Do not import ingestion stores or projection rebuild internals.
- Do not add tools that mutate orders, metrics, benchmarks, evidence facts, business configs, menus, prices, coupons, or customer messages.
- Do not promote Agent output to Core truth; drafts must pass the validator before merchant review.

## Validation
- Run `npm run test:agent`, `npm run check:boundaries`, and `npm run typecheck`.
