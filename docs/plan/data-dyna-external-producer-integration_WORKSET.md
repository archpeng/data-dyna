# data-dyna External Producer Integration Workset

## Stage Order

- [ ] `DD-P4-S1` pilot producer contract and POS source mapping
- [ ] `DD-P4-S2` POS producer fixture mapper and contract tests
- [ ] `DD-P4-S3` non-blocking producer delivery into `/events`
- [ ] `DD-P4-S4` producer runbook, observability, and replay/backfill notes
- [ ] `DD-P4-CLOSEOUT-S1` P4 closeout audit

## Active Stage

### `DD-P4-S1`

- Owner: `execute-plan`
- State: `READY`
- Priority: `high`

目标：

- Define the POS order-paid pilot producer contract and source-to-target mapping before implementation changes.

必须交付：

1. `docs/integration/external-producer-contract.md` defines the P4 producer boundary, pilot scope, delivery semantics, retry/backfill policy, non-blocking failure policy, and residual producers.
2. `docs/integration/pos-event-mapping.md` maps a sanitized POS order-paid producer fixture into `DataDynaEvent` fields, including tenant, source, producer, correlation, entity, properties, and idempotency.
3. The contract states how P2 auth/tenancy credentials and P3 logs/metrics apply to the producer path without real secrets or production traffic.

done_when:

1. The P4 pilot path is explicitly POS `pos.order_paid`, or the slice stops with an explicit residual if no viable POS fixture can be defined from repo truth.
2. The mapping covers every required `DataDynaEvent` field and uses `idempotency.scope = store` with a deterministic producer-side key strategy.
3. Delivery, retry, backfill, and failure behavior state that Data Dyna send failure must not block POS payment/refund primary flows.
4. P5 durable workers, P6 Agent runtime, non-POS producers, production dashboarding, and external repo hookup remain residual.
5. `npm run test:contracts`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if the mapping requires real production credentials, bearer tokens, payment PANs, raw customer PII, or merchant-sensitive payload details.
2. Stop if producer data would bypass P2 auth/tenancy or P3 observability.
3. Stop if the chosen pilot requires external repo changes without explicit authorization and source truth.
4. Stop if PostHog, Aegis, logs, or analytics exports are used as operating-fact sources.

必须避免：

1. Do not implement producer code before the mapping and failure semantics are explicit.
2. Do not choose multiple producers in this first P4 slice.

## Slice Ownership

### `DD-P4-S1`

- Allowed repo surfaces:
  - `docs/integration/external-producer-contract.md`.
  - `docs/integration/pos-event-mapping.md`.
  - `docs/deployment/testable-runtime-deployment.md` only for a minimal P4 runbook link if needed.
  - `docs/plan/*` parser-truth writeback only if needed for planning correction.
- Disallowed surfaces:
  - Runtime producer adapter implementation before mapping acceptance.
  - External repository edits without explicit authorization.
  - P5 durable workers or P6 Agent runtime.

### `DD-P4-S2`

- Allowed repo surfaces:
  - A small producer mapper seam such as `src/app/producers/**` or the smallest equivalent module.
  - POS producer fixtures under `tests/fixtures/**` or inline tests if smaller.
  - Contract tests under `tests/**`.
- Disallowed surfaces:
  - Runtime HTTP delivery or persistence side effects outside mapper/contract proof.
  - Deterministic Core imports of Fastify, PostgreSQL pool construction, runtime auth, or producer delivery clients.
  - Broad event-contract expansion without accepted mapping evidence.

### `DD-P4-S3`

- Allowed repo surfaces:
  - Minimal local/test delivery adapter or harness for `/events`.
  - Runtime tests for accepted, duplicate, unauthorized, invalid, and tenant-mismatch producer paths.
  - Existing app/server injection seams if needed for local/test proof.
- Disallowed surfaces:
  - Real production credentials or real external network calls by default.
  - Replacing P2 auth/tenancy or P3 observability behavior.
  - Durable queue/retry implementation beyond classified non-blocking failure output.

### `DD-P4-S4`

- Allowed repo surfaces:
  - `docs/integration/external-producer-contract.md`.
  - `docs/integration/pos-event-mapping.md`.
  - `docs/deployment/testable-runtime-deployment.md` for local/test runbook additions.
  - Targeted probes/tests for documented producer observability if needed.
- Disallowed surfaces:
  - Production dashboard, paging, mature SLO, or incident-management implementation.
  - P5 durable worker queues.
  - P6 Agent runtime.

### `DD-P4-CLOSEOUT-S1`

- Allowed repo surfaces:
  - `docs/plan/*` parser-truth writeback.
  - Final P4 audit notes and residual handoff.
  - Master tracker update recommendation.
- Disallowed surfaces:
  - New implementation outside reviewed P4 evidence.
  - Hidden durable-worker, Agent, non-POS producer, external-repo, or production-ops completion claims.

## Continuous Wave Ladder

| Order | Slice | Phase loop | Accepted-review next step |
|---|---|---|---|
| 1 | `DD-P4-S1` | `execute -> review` | activate `DD-P4-S2` |
| 2 | `DD-P4-S2` | `execute -> review` | activate `DD-P4-S3` |
| 3 | `DD-P4-S3` | `execute -> review` | activate `DD-P4-S4` |
| 4 | `DD-P4-S4` | `execute -> review` | activate `DD-P4-CLOSEOUT-S1` |
| 5 | `DD-P4-CLOSEOUT-S1` | `review -> accepted-writeback` | activate `PACK_COMPLETE` or P5 successor pack |
| terminal | `PACK_COMPLETE` | `closeout` | repo-local closeout prompt surface, then master_plan writeback for P5 |

`currentWave/maxWaves` or any scheduler wave count is not objective-completion proof; only parser truth and accepted review evidence can permit terminal closeout.

## Expected Verification

For parser-truth writeback:

```bash
npm run check:plan
git diff --check
plan_sync /home/peng/dt-git/github/data-dyna/docs/plan
```

For `DD-P4-S1` contract/mapping docs:

```bash
npm run test:contracts
npm run check:plan
git diff --check
```

General validation escalation for implementation slices:

```bash
npm run test:contracts
npm run test:runtime
npm run check:boundaries
npm run typecheck
npm test
npm run check:plan
git diff --check
```

Run observability probe when producer runtime paths or redaction evidence change:

```bash
npm run probe:observability
```

Run database migration checks only if P4 changes persistence schema or migrations:

```bash
npm run test:db:migrations
```

## Execution Notes

- This pack is active because P3 observability reached `PACK_COMPLETE` and P4 is the next production-readiness gate before durable worker execution.
- The pilot producer is POS order-paid (`source: pos`, `domain: transaction_scene`, `name: pos.order_paid`).
- Accepted review is the only normal point where `README` / `STATUS` / `WORKSET` should advance to the next stage.
- If real external producer code is unavailable, keep the external repo hookup residual explicit and prove the Data Dyna-side fixture/adapter contract instead.
- If a slice requires durable queue semantics, Agent runtime ownership, production observability vendor setup, mature SLOs, or cloud deployment hardening, route `needs_replan` rather than expanding P4.

## Residual Queue

Known out-of-scope residuals for this P4 pack:

- Non-POS producers: additional POS events, miniapp, mobile-hq, and backend fact sync.
- External POS repository/runtime hookup if not available inside this repo.
- P5: durable worker queue, retries, checkpoints, dead letters, and idempotent background processing.
- P6: full Agent runtime, real Pi provider integration, provider audit, validator/merchant-review runtime governance.
- Full production observability backend selection, dashboards, paging policy, mature SLO/incident-management process, and capacity planning.
- Cloud production secret management and deployment hardening beyond local/test env contract.
- Master tracker follow-up after this pack closes: mark `DD-PR-MASTER-P4` done and activate `DD-PR-MASTER-P5`.

## Machine Queue

- active_step: `DD-P4-S1`
- latest_completed_step: `MASTER-WRITEBACK-P4-ACTIVATION`
- intended_handoff: `execute-plan`
- latest_plan_summary: Created the concrete P4 external producer integration pack with POS order-paid as the first pilot path.
- latest_verification:
  - `data-dyna-observability-foundation STATUS/WORKSET are PACK_COMPLETE with done=5 pending=0.`
  - `Production-readiness master tracker marks DD-PR-MASTER-P3 done and activates DD-PR-MASTER-P4.`
  - `README now points at this P4 pack with DD-P4-S1 ready for execute-plan.`
