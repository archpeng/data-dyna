# Evidence Store v1

`DD-P5-S1` closes the first deterministic loop from merchant-reviewed experiment adoption to measured outcome evidence.

## Boundary

Evidence records are Core facts built from stored references:

```text
merchant accepted/applied plan
  -> before/after metric snapshots
  -> action_effect + guardrail_result
  -> intervention_trajectory
  -> evidence_record
```

The interpretation is directional before/after evidence, not causal proof. The first version does not claim statistical significance, counterfactual attribution, or LLM-authored outcomes.

## Implemented surfaces

- `src/evidence/evidence-store.ts`
- `migrations/0007_evidence_store.sql`
- `tests/evidence-dd-p5-s1.spec.ts`

## Tables

Migration `0007_evidence_store.sql` defines:

1. `action_effects`
2. `guardrail_results`
3. `intervention_trajectories`
4. `evidence_records`

All records carry deterministic evidence refs. `evidence_records.llm_generated_claims` is constrained to an empty JSON array because LLM-generated claims are not evidence facts.

## Sample and confidence labels

| Label | Meaning |
|---|---|
| `sufficient` | Before and after snapshots have metric values and meet the minimum denominator. |
| `weak_sample` | Before and after values exist but at least one denominator is below the minimum. |
| `needs_more_data` | A value is missing, a denominator is zero, or a required guardrail snapshot is absent. |

Weak and missing data remain visible. Missing guardrail data produces `needs_more_data`; it is not treated as passing.

## Guardrail semantics

A primary metric can improve while a guardrail degrades. That is recorded as:

```text
overallVerdict = mixed_guardrail_degraded
```

It must not be recorded as `clean_success`.

## Evidence six-tuple

Each evidence record is reproducible from stored refs around:

1. segment (`segmentRef`)
2. gap/problem (`opportunityGapId`)
3. intervention (`experimentPlanId`)
4. outcome (`outcomeRef` / `actionEffectId`)
5. guardrail (`guardrailRefs`)
6. adoption (`adoptionRefs`)

Merchant adoption refs from `DD-P4-S1` are required. Evidence without merchant adoption is incomplete, and every accepted evidence record must keep merchant adoption refs visible.

## Non-goals

- No causal overclaim beyond before/after evidence.
- No hidden pass when guardrail data is missing.
- No LLM-generated claim as a Core evidence fact.
- No external frontend or production database migration execution in this slice.
