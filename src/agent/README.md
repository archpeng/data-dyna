# agent

## Owns
- Agent context bundles, safe tool policy, fixture sidecar adapter, experiment plan drafts, and deterministic validator gate.

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
