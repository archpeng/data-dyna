# Data Dyna Event Contract v1

## Purpose

`src/contracts/event-contract.ts` is the first deterministic Event Contract for `DD-P0-S1`. It turns the three-plane collection loop from the roadmap into a shared schema that later ingestion and projection slices can validate before writing Core facts.

## Package and Validation

- Package manager: npm (`package.json`, `package-lock.json` after install)
- Contract source: `src/contracts/event-contract.ts`
- Validation commands:
  - `npm test`
  - `npm run typecheck`
  - `git diff --check`

## Envelope Fields

Every accepted event must carry:

- `version`
- `source`
- `producer`
- `identity`
- `correlation`
- `entity`
- `properties`
- `idempotency`

The first source enum covers the intended factual inputs:

- `mini_program` for user behavior
- `pos` for transaction-scene events
- `mobile_hq` for merchant review/adoption events
- `datamesh` for imported factual snapshots such as RFM
- `system` for deterministic Core/system events

## Boundary

This contract records facts and factual lifecycle events only. It does not encode AI recommendations as Core facts. Pi Agent-generated hypotheses and experiment plans remain sidecar outputs until later validator and merchant-review slices define their own controlled contracts.

## SSOT Trace

This file links to the existing decisions in:

- `docs/roadmap/control-plane-data-core-integration-roadmap.md`
- `docs/roadmap/independent-cafe-data-first-mvp-roadmap.md`
- `docs/analyse/data-dyna-three-step-technical-method.md`
- `docs/analyse/data-dyna-step3-scaling-law-intervention-hypothesis.md`
- `docs/stack/data-dyna-core-and-pi-agent-sidecar-architecture.md`
