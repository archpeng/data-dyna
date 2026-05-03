# data-dyna Autopilot Workset

## Stage Order

- [x] `DD-P0-S1` core workspace and shared Event Contract foundation
- [x] `DD-P0-S2` event ingestion API and raw event store
- [x] `DD-P1-S1` external fact snapshots and business projections
- [x] `DD-P1-S2` independent-café profile, segment, and metric snapshots
- [x] `DD-P2-S1` peer benchmark and opportunity gap engine
- [x] `DD-P3-S1` Pi Agent sidecar runtime foundation
- [x] `DD-P3-S2` agent tools, prompts, skills, and deterministic validator
- [x] `DD-P4-S1` merchant review, adoption, and action lifecycle contracts
- [x] `DD-P5-S1` effect review, guardrail measurement, and Evidence Store
- [x] `DD-CLOSEOUT-S1` readiness audit and next-plane handoff

## Active Stage

### `PACK_COMPLETE`

- Owner: `closeout`
- State: `DONE`
- Priority: `terminal`

目标：

- close the pack through the repo-local closeout prompt surface

必须交付：

1. final closeout summary and residual handoff

必须避免：

1. dispatching another execute/review phase from terminal parser truth
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
  - `src/evidence/evidence-store.ts`
  - `migrations/0007_evidence_store.sql`
  - `tests/evidence-dd-p5-s1.spec.ts`
  - `docs/evidence-store-v1.md`
  - `package.json` test script append only if needed
- Disallowed surfaces:
  - causal overclaim beyond available evidence
  - LLM-authored evidence facts
  - evidence records without merchant adoption refs
  - hiding missing guardrail data

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
| 10 | `DD-CLOSEOUT-S1` | `review -> accepted-writeback` | activate `PACK_COMPLETE` only if full objective is audited |
| terminal | `PACK_COMPLETE` | `closeout` | repo-local closeout prompt surface |

`currentWave/maxWaves` or any scheduler wave count is not objective-completion proof; only parser truth `PACK_COMPLETE` can permit closeout.

## Hard Closeout Guard

Closeout is forbidden unless this WORKSET and `docs/plan/README.md` parse as:

```text
Active Stage: PACK_COMPLETE
Owner: closeout
State: DONE
Remaining non-deferred stages: none
```

Closeout is allowed only because this WORKSET and README now parse as `PACK_COMPLETE`, owner `closeout`, state `DONE`, with no non-deferred stages remaining.

## Expected Verification

For terminal `PACK_COMPLETE` closeout:

1. Preserve accepted slice evidence for DD-P0 through DD-P5 and DD-CLOSEOUT.
2. Preserve residuals for external producers, live Datamesh, production DB migration, privacy/governance, Agent provider credentials, and pilot deployment.
3. Do not start external repo work or production/live integration from the closeout prompt surface without a new explicit plan.
4. Keep README/PLAN/STATUS/WORKSET aligned on terminal parser state.

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

Core residuals:

- Apply migrations to a real PostgreSQL environment only under a production/deployment plan with credentials and rollback checks.
- Wire durable workers/API handlers around the pure projection, snapshot, benchmark, merchant-review, and evidence functions.
- Add operational idempotency/rebuild observability before live ingestion volume.

Agent residuals:

- Configure real Pi SDK/model/provider credentials and runtime deployment mode outside local fixture tests.
- Register project-local Pi extension/tool descriptors in the chosen runtime package after deployment ownership is known.

External integration residuals:

- Create a new explicit cross-repo plan before editing mini-program, POS, `mobile-hq`, `hq-bff-service`, or `g-hq-orchestrator`.
- Implement producer SDK/host bridge instrumentation against the accepted Event Contract and merchant-review event names.
- Keep POS/backend order/payment/refund facts authoritative; frontend events remain attribution helpers.

Data governance residuals:

- Review peer benchmark privacy thresholds, consent, retention, and de-identification before live multi-merchant use.
- Validate Datamesh RFM access to `report.crm.member_labels` with governed credentials; this pack used fixture/contracts only.

Production ops residuals:

- Add environment configuration, migration checks, monitoring/alerts, backup/restore, and incident runbooks before merchant pilot.
- Run a governed pilot merchant validation plan; do not reinterpret directional before/after records as causal/statistical proof without a new method.

## Machine Queue

- active_step: `PACK_COMPLETE`
- latest_completed_step: `PACK_COMPLETE`
- intended_handoff: `autopilot-closeout`
- latest_closeout_summary: Closed data-dyna-autopilot as PACK_COMPLETE.
- latest_verification:
  - `plan_sync /home/peng/dt-git/github/data-dyna/docs/plan: STATUS 10 done / 0 pending; WORKSET 10 done / 0 pending.`
  - `README/STATUS/WORKSET readback confirms active slice PACK_COMPLETE and closeout/DONE terminal state.`
  - `npm test passed across event contract, ingestion, projections, snapshots, benchmarks, agent sidecar/tools/validator, merchant review, and evidence-store specs.`
  - `npm run typecheck passed via tsc --noEmit.`
  - `git diff --check passed; git status clean.`
  - `docs/plan/README.md`
  - `docs/plan/data-dyna-autopilot_PLAN.md`
  - `docs/plan/data-dyna-autopilot_STATUS.md`
  - `docs/plan/data-dyna-autopilot_WORKSET.md`
  - `package.json`
  - `package-lock.json`
  - `tsconfig.json`
  - `src/`
  - `tests/`
  - `migrations/`
  - `docs/*-v1.md`
  - `.pi/`
- terminal: `true`