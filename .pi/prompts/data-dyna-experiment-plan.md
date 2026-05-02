---
description: Draft a Data Dyna experiment plan from an AgentContextBundle without creating facts or applying actions
argument-hint: "<agent-context-bundle-json>"
---
Given this Data Dyna AgentContextBundle:

$ARGUMENTS

Draft exactly one intervention hypothesis and one experiment plan.

Rules:
- Generate hypotheses, not facts.
- Use only deterministic context and evidence_refs from the bundle.
- Include uncertainty, confidence, assumptions, guardrails, rollback support, stop criteria, and merchant confirmation requirement.
- Do not directly apply menu, price, coupon, customer-message, order, metric, benchmark, evidence, or business-config changes.
- Treat peer benchmark comparison as directional and non-causal.
- Return a draft for deterministic validation and merchant review only.
