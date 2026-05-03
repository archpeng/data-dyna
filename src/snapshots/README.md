# snapshots

## Owns
- Independent-café store profile, metric snapshots, segment candidates, and merchant segment confirmations.

## Inputs
- `BusinessProjections`, brand/store/date selectors, and optional merchant confirmations.

## Outputs
- Store profile snapshots, metric definitions/snapshots, restaurant segment candidates, and confirmation records.

## Allowed imports
- `src/projections/**` types and runtime schema libraries.

## Forbidden
- Do not import benchmarks, Agent, merchant-review, or evidence modules.
- Do not replace Datamesh member RFM snapshots with ad hoc RFM calculations.
- Do not mark a segment as confirmed without an explicit merchant confirmation input.

## Validation
- Run `npm run test:core` and `npm run typecheck`.
