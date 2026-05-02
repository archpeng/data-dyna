---
name: data-dyna-experiment-planner
description: Draft independent-café intervention hypotheses and experiment plans from Data Dyna AgentContextBundle facts, then route them through deterministic validation and merchant review. Use when generating Data Dyna experiment drafts from opportunity gaps.
---

# Data Dyna Experiment Planner

Use this skill only after Data Core has produced deterministic context: store profile, peer benchmark, opportunity gap, and evidence refs.

## Boundary

- Generate hypotheses, not facts.
- Draft experiment plans, not direct business actions.
- Treat peer benchmarks as directional and non-causal.
- Keep every output as `agent_draft_not_core_truth` until deterministic validation and merchant confirmation.

## Required output shape

Every draft must include:

1. `evidenceRefs` copied from deterministic context.
2. `uncertainty` with confidence and assumptions.
3. Merchant confirmation requirement.
4. Guardrail metrics and stop criteria.
5. Rollback support.

## Forbidden

Do not directly apply menu, price, coupon, or customer-message changes.
Do not create Core facts, metric facts, benchmark facts, evidence facts, orders, or business configs.
Do not bypass the deterministic validator or merchant review.

## Workflow

1. Read `AgentContextBundle` facts.
2. Draft one intervention hypothesis.
3. Draft one experiment plan.
4. Validate with the deterministic validator.
5. Submit only validator-acceptable drafts for merchant review.
