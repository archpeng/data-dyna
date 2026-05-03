# datamesh

## Owns
- Parsing Datamesh member label rows and mapping them into member RFM snapshot inputs.

## Inputs
- Rows from `report.crm.member_labels` with RFM tags and 90-day payment metrics.

## Outputs
- `MemberRfmSnapshotInput` values for projection rebuilds.

## Allowed imports
- Runtime schema libraries such as `zod`.

## Forbidden
- Do not compute merchant decisions, benchmarks, Agent drafts, or evidence here.
- Do not change the RFM source table or field meaning without matching contract/test updates.

## Validation
- Run `npm run test:core` and `npm run typecheck`.
