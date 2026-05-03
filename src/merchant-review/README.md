# merchant-review

## Owns
- Merchant review submissions, decisions, lifecycle records, rejection preference candidates, and explicit preference confirmations.

## Inputs
- Accepted validator results, experiment plans, merchant actors, review decisions, lifecycle events, and evidence refs.

## Outputs
- Review records, acceptance/rejection/modification decisions, bounded lifecycle transitions, preference candidates, and confirmed preferences.

## Allowed imports
- Event contracts, Agent experiment-plan types, and Agent validator result types.

## Forbidden
- Do not submit plans unless the validator decision is `accept`.
- Do not allow invalid lifecycle transitions or applied/reverted records without required rollback/acceptance refs.
- Do not turn rejection reasons into permanent merchant preferences without merchant confirmation.

## Validation
- Run `npm run test:review` and `npm run typecheck`; manually inspect lifecycle safety.
