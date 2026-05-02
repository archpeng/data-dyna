# Merchant Review Contract v1

`DD-P4-S1` adds the server-side contract that lets a later `mobile-hq` bridge show validated experiment plans, record merchant review decisions, and track adoption lifecycle facts without changing external frontend repos in this slice.

## Boundary

```text
Data Core owns facts.
Pi Agent proposes hypotheses.
Validator gates drafts.
Merchant confirms actions.
Evidence proves outcome.
```

This contract starts only after `validateExperimentPlan(...)` returns `accept`. The Agent draft is still not Core truth; the submitted review record is a Core persistence fact saying a draft was made available for merchant review.

No external frontend repo change is required to validate the server-side contract. `mobile-hq` integration is a later bridge that should use these event names instead of inventing remote-local names.

## Review flow

```text
agent draft
  -> deterministic validator accept
  -> experiment_plan_reviews row
  -> review viewed
  -> accepted | modified | rejected
```

Implemented schemas/functions live in `src/merchant-review/experiment-review.ts`:

- `submitExperimentPlanForMerchantReview`
- `recordExperimentReviewViewed`
- `acceptExperimentReview`
- `rejectExperimentReview`
- `recordExperimentReviewModification`
- `recordActionLifecycleTransition`
- `createPreferenceCandidateFromRejection`
- `confirmMerchantPreference`
- `buildMobileHqMerchantActionEvent`

## Event names

Bounded `mobile_hq` merchant-action names:

| Event name | Meaning |
|---|---|
| `mobile_hq.experiment_review_submitted` | Data Core/server submitted a validated draft for merchant review. |
| `mobile_hq.experiment_review_viewed` | Merchant opened the review surface. |
| `mobile_hq.experiment_accepted` | Merchant explicitly accepted the plan. |
| `mobile_hq.experiment_modified` | Merchant requested/recorded a modification while the draft remains review-controlled. |
| `mobile_hq.experiment_rejected` | Merchant explicitly rejected the plan. |
| `mobile_hq.experiment_applied_recorded` | System recorded merchant adoption/application fact after acceptance and rollback contract. |
| `mobile_hq.experiment_reverted_recorded` | System recorded merchant rollback/revert fact. |
| `mobile_hq.merchant_preference_confirmed` | Merchant explicitly confirmed a preference candidate. |

`mobile-hq` remotes should emit through a host bridge or shared client. PostHog may receive async mirrors, but Core persistence is authoritative.

## Lifecycle state machine

```text
suggested
  -> drafted
  -> accepted | rejected
  -> applied
  -> measured
  -> kept | reverted | extended | retest_needed
```

Rules enforced in code and migration:

1. `drafted -> accepted` and `drafted -> rejected` require an explicit merchant decision.
2. `accepted -> applied` requires `acceptanceDecisionId`, `rollbackRef`, and `businessMutationCalled = false`.
3. `measured -> reverted` requires `rollbackRef` and `businessMutationCalled = false`.
4. Invalid jumps such as `drafted -> applied` are rejected.

`applied` and `reverted` are adoption records in this slice. They must not call menu, price, coupon, customer-message, order, metric, benchmark, evidence, or business-config mutation services.

## Rejection-to-preference semantics

A rejection reason can create only a candidate:

```text
experiment rejected
  -> merchant_preference_candidates.status = candidate_pending_confirmation
  -> merchant explicitly confirms
  -> merchant_preferences.status = confirmed
```

Rejection text must not silently become a permanent preference. `confirmMerchantPreference(...)` is the only schema path that creates a confirmed preference fact.

## Core persistence

Migration `migrations/0006_merchant_review.sql` creates Core tables:

- `experiment_plan_reviews`
- `experiment_review_views`
- `experiment_review_decisions`
- `experiment_action_lifecycle_records`
- `merchant_preference_candidates`
- `merchant_preferences`

The lifecycle table has `business_mutation_called BOOLEAN NOT NULL DEFAULT FALSE CHECK (business_mutation_called = FALSE)`, proving this slice records adoption facts rather than invoking real business mutations.

## PostHog boundary

The existing `toPostHogSinkEvent(...)` can mirror bounded `mobile_hq.*` events asynchronously. PostHog is optional product analytics only; it is never the authoritative review/adoption store.
