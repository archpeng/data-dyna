# Data Dyna Agent Experiment Plan v1

`DD-P3-S2` adds the safe Agent planning surface above the accepted `DD-P3-S1` sidecar. It keeps Pi Agent useful for hypothesis generation while preserving deterministic Data Core ownership.

## Tool boundary

`src/agent/agent-tools.ts` now mirrors the P6 prepared read-only runtime tool names instead of preserving old draft/validate/submit aliases.

Allowed read tools are:

1. `read_worker_freshness`
2. `read_projection_summary`
3. `read_snapshot_summary`
4. `read_benchmark_opportunity_gaps`
5. `read_evidence_records`
6. `read_dead_letter_diagnosis`

Every descriptor must use `mutationPolicy = no_core_or_business_mutation`. Direct mutation-like tools for menu, price, coupon, customer messaging, orders, metrics, benchmarks, evidence facts, or business configs are denied by allowlist policy. Draft validation and merchant-review handoff are result gates, not runtime tools or compatibility aliases.

## Structured drafts

`src/agent/experiment-plan.ts` defines:

- `intervention-hypothesis.v1`
- `experiment-plan.v1`

Both keep `truthStatus = agent_draft_not_core_truth` and `requestedCoreWrites = []`.

A valid experiment plan must carry:

- deterministic identity: brand, store, opportunity gap, and agent run
- evidence refs from the context bundle
- uncertainty, confidence, and assumptions
- merchant confirmation requirement
- guardrail metric checks
- rollback support and stop criteria

## Deterministic validator

`src/agent/experiment-validator.ts` returns one of:

- `accept`
- `block`
- `needs_more_data`

The validator is deterministic. It checks schemas, identity, evidence refs, uncertainty/confidence, draft-not-truth status, no Core writes, merchant confirmation, rollback support, guardrails, and peer sample status. It does not call an LLM and does not let the Agent decide safety.

`src/agent/result-boundary.ts` parses captured Agent drafts into deterministic hypothesis/experiment-plan artifacts, records `draft_validation_evaluated`, and only emits `merchant_review_requested` after an accepted validation gate. It does not imply merchant approval or execute business mutations.

## Project-local Pi surfaces

The project-local Pi skill and prompt are:

- `.pi/skills/data-dyna-experiment-planner/SKILL.md`
- `.pi/prompts/data-dyna-experiment-plan.md`

They instruct the Agent to generate hypotheses from Data Core context, not facts or direct actions. All drafts remain subject to deterministic validation and merchant review.

## Local validation

Local validation remains credential-free:

```bash
npm test
npm run typecheck
git diff --check
```

`tests/agent-dd-p3-s2.spec.ts` proves fixture draftability, safe tool policy, denied mutation-like tools, prompt/skill guardrails, and deterministic `accept` / `block` / `needs_more_data` validator outcomes.
