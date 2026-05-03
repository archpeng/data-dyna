# benchmarks

## Owns
- Peer groups, aggregate peer benchmarks, and directional opportunity gaps for independent cafés.

## Inputs
- Target and peer metric snapshots plus target and peer restaurant segment candidates.

## Outputs
- aggregate-only peer groups/benchmarks and ranked opportunity gaps when peer sample is sufficient.

## Allowed imports
- `src/snapshots/**` types and runtime schemas.

## Forbidden
- Do not expose peer store IDs or non-aggregate peer data.
- Do not rank weak/insufficient samples as launch-ready opportunities.
- Do not describe benchmark gaps as causal proof; they are directional and non-causal.

## Validation
- Run `npm run test:core` and `npm run typecheck`.
