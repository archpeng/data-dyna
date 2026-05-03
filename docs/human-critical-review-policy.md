# Human-Critical Review Policy

This repo has no checked-in `CODEOWNERS` convention or verified owner handles. Until those exist, this document is the human-critical review source of truth for AI and human coders.

## Protected paths

| Path | Why human-critical | Required reviewer checks |
|---|---|---|
| `src/merchant-review/**` | Owns merchant decision lifecycle, adoption/rejection state, and preference confirmation semantics. | Verify lifecycle transitions are explicit, reversible where intended, and do not turn rejection reasons into permanent merchant preferences without confirmation. |
| `src/evidence/**` | Owns experiment evidence records and interpretation guardrails. | Verify evidence stays non-causal / directional, preserves aggregate/de-identified inputs, and does not let generated claims become facts. |
| `src/agent/agent-tools.ts` | Defines the Agent tool surface. | Verify tools remain read/draft/validate only; no tool may mutate orders, metrics, benchmarks, evidence facts, menu, prices, coupons, or customer messages. |
| `src/agent/experiment-validator.ts` | Gates Agent draft safety before merchant review. | Verify validator checks evidence support, sample thresholds, guardrails, and no-mutation constraints before a draft can proceed. |
| `migrations/**` | Defines durable storage contracts for events, projections, snapshots, benchmarks, agent runs, merchant review, and evidence. | Verify schema changes preserve event identity, append/audit behavior, contract versions, required fields, enum/check constraints, and safety fields such as generated-claim and business-mutation guards. |

## Required review rules

1. Human review is required before merging changes touching any protected path.
2. AI coders may propose edits to protected paths only when the active plan slice names the path and validation gate.
3. Do not authorize business mutation from Agent code or tools.
4. Do not weaken merchant review lifecycle transitions, validator safety gates, evidence non-causal interpretation, migration safety constraints, or external repo boundaries.
5. Do not edit external producer repos from this repo-local workstream; create a separate cross-repo plan instead.
6. Run the narrow module test plus `npm run typecheck`; run `npm test` when behavior or shared contracts changed.

## Minimum local checks

- Agent tool or validator changes: `npm run test:agent` and `npm run typecheck`.
- Merchant review changes: `npm run test:review` and `npm run typecheck`.
- Evidence changes: `npm run test:evidence` and `npm run typecheck`.
- Migration changes: `git diff --check`, manual SQL review against the contract docs, and the schema/migration safety checker once available.
- Cross-module import changes: `npm run check:boundaries`.
