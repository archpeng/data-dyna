# data-dyna Autopilot Workset

## Stage Order

- [ ] `DD-P0-S1` core workspace and shared Event Contract foundation
- [ ] `DD-P0-S2` event ingestion API and raw event store
- [ ] `DD-P1-S1` external fact snapshots and business projections
- [ ] `DD-P1-S2` independent-café profile, segment, and metric snapshots
- [ ] `DD-P2-S1` peer benchmark and opportunity gap engine
- [ ] `DD-P3-S1` Pi Agent sidecar runtime foundation
- [ ] `DD-P3-S2` agent tools, prompts, skills, and deterministic validator
- [ ] `DD-P4-S1` merchant review, adoption, and action lifecycle contracts
- [ ] `DD-P5-S1` effect review, guardrail measurement, and Evidence Store
- [ ] `DD-CLOSEOUT-S1` readiness audit and next-plane handoff

## Active Stage

### `DD-P0-S1`

- Owner: `execute-plan`
- State: `READY`
- Priority: `highest`

目标：

- Turn the docs-only repo into the smallest runnable TypeScript workspace and define the first versioned Event Contract for the three-plane data loop.

必须交付：

1. Minimal package/workspace scaffolding for `data-dyna` implementation.
2. Shared event envelope and first event-name/domain schemas using Zod.
3. Basic test/typecheck scripts or a documented minimal validation substitute.
4. Documentation note linking the contract to roadmap/analyse SSOT decisions.

done_when:

1. A fresh executor can identify the package manager, contract source path, and validation command from repo files.
2. Event envelope includes version, source, producer, identity, correlation, entity, properties, and idempotency fields.
3. At least mini-program, POS, mobile-hq, Datamesh/system source enums are represented.
4. Contract validation has proof from a command or explicitly recorded reason if dependency install is unavailable.

stop_boundary:

1. Stop and replan if choosing a framework/package manager requires user/product approval not present in docs.
2. Stop before editing external producer repos.
3. Stop if event contract tries to encode AI recommendations as facts.
4. Stop if implementation requires secrets, Datamesh credentials, or production endpoints.

必须避免：

1. Do not build analytics dashboards in this slice.
2. Do not introduce Kafka/Flink/ClickHouse/vector DB.
3. Do not couple contract schemas to PostHog as the source of truth.
4. Do not create Agent runtime before deterministic Core scaffolding exists.

## Slice Ownership

### `DD-P0-S1`

- Allowed repo surfaces:
  - `package.json` / lockfile / workspace config if needed
  - `src/**` or `packages/**` minimal contract source paths
  - `test/**` / `tests/**` / colocated contract tests
  - `docs/**` notes only when needed for contract traceability
- Disallowed surfaces:
  - External repos under `/home/peng/dt-git/frontend`, `/home/peng/dt-git/rms`, `/home/peng/dt-git/bff`
  - Production endpoints, secrets, Datamesh live credentials

### `DD-P0-S2`

- Allowed repo surfaces:
  - Core API/ingestion source
  - DB schema/migrations
  - raw event tests/fixtures
  - optional PostHog sink interface
- Disallowed surfaces:
  - Producer repo instrumentation
  - Metric computation shortcuts in ingestion controllers

### `DD-P1-S1`

- Allowed repo surfaces:
  - Projection schemas/workers
  - fixture facts/events
  - Datamesh RFM adapter contract and tests
- Disallowed surfaces:
  - Live Datamesh mutation or RFM recalculation
  - Treating frontend/POS event as final order truth

### `DD-P1-S2`

- Allowed repo surfaces:
  - Store/profile/segment/metric modules
  - metric definition docs/tests
  - fixture-based snapshots
- Disallowed surfaces:
  - LLM-only segment classification
  - full generic restaurant BI scope

### `DD-P2-S1`

- Allowed repo surfaces:
  - peer group / benchmark / opportunity gap modules
  - privacy threshold docs/tests
  - fixture benchmark data
- Disallowed surfaces:
  - cross-merchant personal data exposure
  - hard-coded concrete action ranking as primary model

### `DD-P3-S1`

- Allowed repo surfaces:
  - agent runtime wrapper/adapters
  - context bundle contract
  - agent_runs audit model
  - Pi SDK/RPC decision notes
- Disallowed surfaces:
  - direct business mutation tools
  - Agent writes to deterministic fact tables

### `DD-P3-S2`

- Allowed repo surfaces:
  - `.pi/extensions/**` if project-local extension is created
  - `.pi/skills/**` if project-local skill is created
  - `.pi/prompts/**` if project-local prompt templates are created
  - `packages/pi-agent-tools/**` or equivalent safe tool schemas
  - validator modules/tests
- Disallowed surfaces:
  - tool calls that apply menu/price/coupon/customer-message changes
  - LLM-only validation

### `DD-P4-S1`

- Allowed repo surfaces:
  - merchant review API/schema/contracts
  - adoption event contract
  - action lifecycle state machine tests
  - integration docs for later `mobile-hq` bridge
- Disallowed surfaces:
  - direct edits to `mobile-hq` family repos without new workset
  - silent action apply/revert

### `DD-P5-S1`

- Allowed repo surfaces:
  - effect/guardrail/evidence schemas and workers
  - before/after measurement tests
  - evidence_record generation tests
- Disallowed surfaces:
  - causal overclaim beyond available evidence
  - LLM-authored evidence facts

### `DD-CLOSEOUT-S1`

- Allowed repo surfaces:
  - docs/plan writeback
  - audit/residual docs
  - final verification notes
- Disallowed surfaces:
  - hidden implementation changes outside reviewed evidence
  - second plan root creation

## Continuous Wave Ladder

| Order | Slice | Phase loop | Accepted-review next step |
|---|---|---|---|
| 1 | `DD-P0-S1` | `wave_plan -> execute -> review` | activate `DD-P0-S2` |
| 2 | `DD-P0-S2` | `wave_plan -> execute -> review` | activate `DD-P1-S1` |
| 3 | `DD-P1-S1` | `wave_plan -> execute -> review` | activate `DD-P1-S2` |
| 4 | `DD-P1-S2` | `wave_plan -> execute -> review` | activate `DD-P2-S1` |
| 5 | `DD-P2-S1` | `wave_plan -> execute -> review` | activate `DD-P3-S1` |
| 6 | `DD-P3-S1` | `wave_plan -> execute -> review` | activate `DD-P3-S2` |
| 7 | `DD-P3-S2` | `wave_plan -> execute -> review` | activate `DD-P4-S1` |
| 8 | `DD-P4-S1` | `wave_plan -> execute -> review` | activate `DD-P5-S1` |
| 9 | `DD-P5-S1` | `wave_plan -> execute -> review` | activate `DD-CLOSEOUT-S1` |
| 10 | `DD-CLOSEOUT-S1` | `review/closeout` | repo-local closeout prompt surface |

## Expected Verification

For active `DD-P0-S1`:

1. Inspect repo root to confirm no existing implementation scaffolding conflicts.
2. Create/validate minimal package/workspace and event contract schema.
3. Run the narrowest available validation command created by the slice, or record why dependency execution is unavailable.
4. Run `git diff --check`.
5. Keep `docs/plan/*` active slice unchanged until review accepts completion.

General validation escalation as commands become available:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run db:migrate:check
git diff --check
```

## Execution Notes

- The active stage ID is the `stepId` for active-slice `autopilot_report` calls.
- `execute/completed` routes to `execution-reality-audit`, not terminal completion.
- Accepted review is the only normal point where `STATUS` / `WORKSET` should advance to the next stage.
- If validation fails and the fix is within the same dominant owner boundary, route `review/continue` -> `execute` same slice.
- If validation failure changes owner boundary, framework choice, data ownership, production credentials, or external repo scope, route `needs_replan` -> `plan-creator`.
- Do not jump from early Core slices to Agent or closeout slices without accepted review evidence for intervening slices.

## Residual Queue

- External producer SDK integration for mini-program, POS, and `mobile-hq` should become a separate cross-repo plan after Core contracts stabilize.
- Production Datamesh connectivity and credentials should become a deployment/integration slice after fixture contract work.
- Multi-merchant benchmark production governance needs privacy threshold and consent review before live use.
- Agent model/provider credentials and Pi runtime deployment mode need environment-specific configuration after local sidecar contracts exist.
