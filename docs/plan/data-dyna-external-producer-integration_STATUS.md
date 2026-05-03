# data-dyna External Producer Integration Status

## Current State

- state: `READY`
- owner: `execute-plan`
- route: `PLAN -> EXEC -> REVIEW -> REPLAN -> CLOSEOUT`
- workstream: `data-dyna-external-producer-integration`
- pack_mode: `single-root docs/plan machine-compatible active-pack`
- source_truth: `docs/roadmap/data-dyna-production-readiness-roadmap.md`, completed P2 auth/tenancy pack, completed P3 observability pack, runtime event/auth/observability surfaces

## Current Step

- active_step: `DD-P4-S1`
- active_wave: `wave-1`
- mode: `ready_for_execute`
- intended_handoff: `execute-plan`

## Planned Stages

- [ ] `DD-P4-S1` pilot producer contract and POS source mapping
- [ ] `DD-P4-S2` POS producer fixture mapper and contract tests
- [ ] `DD-P4-S3` non-blocking producer delivery into `/events`
- [ ] `DD-P4-S4` producer runbook, observability, and replay/backfill notes
- [ ] `DD-P4-CLOSEOUT-S1` P4 closeout audit

## Immediate Focus

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

## Current Technical Consensus

- P4 starts only because P2 auth/tenancy and P3 observability reached `PACK_COMPLETE` with accepted evidence.
- The first concrete producer path is POS `pos.order_paid`; other POS events, miniapp events, mobile-hq events, and backend fact sync remain residual until this pilot path is accepted.
- Real producer data must enter through the existing `/events` auth, tenancy, idempotency, and observability gates.
- Data Dyna send failures must not block POS payment, refund, cancellation, or cashier primary flows.
- P5 durable worker queues and P6 Agent runtime remain successor packs, not P4 implementation shortcuts.

## Expected Validation Ladder

Always run after parser-truth edits:

```bash
npm run check:plan
git diff --check
```

For `DD-P4-S1` contract/mapping docs:

```bash
npm run test:contracts
npm run check:plan
git diff --check
```

Escalate as P4 implementation slices add mapper, runtime delivery, or observability proof:

```bash
npm run test:contracts
npm run test:runtime
npm run probe:observability
npm run check:boundaries
npm run typecheck
npm test
npm run check:plan
git diff --check
```

Run database migration checks only if P4 changes database schema, persistence behavior, or repository code:

```bash
npm run test:db:migrations
```

## Blockers

- None currently known for `DD-P4-S1` planning/contract execution.
- External POS repository/runtime availability is not assumed; if unavailable, P4 must keep external hookup residual and prove the Data Dyna-side contract/fixture path.

## Residuals / Notes

- Non-POS producers remain residual: additional POS events, miniapp, mobile-hq, and backend fact sync.
- P5 durable queue, retries, checkpoints, dead letters, and worker idempotency remain residual.
- P6 Agent runtime, provider integration, and Agent governance remain residual.
- Production cloud deployment, secret management, dashboards, paging, mature SLOs, and incident management remain residual.

## Master Writeback Evidence

- `data-dyna-observability-foundation` reached `PACK_COMPLETE` with accepted P3 closeout evidence.
- P3 evidence covers redaction-safe logs, metrics/counters, query/runbook notes, targeted probe, and residual handoff.
- Master tracker writeback marks `DD-PR-MASTER-P3` done and activates `DD-PR-MASTER-P4`; this pack is the concrete P4 execution queue.

## Execution Evidence

- No P4 execution slices have run yet. `DD-P4-S1` is ready for `execute-plan`.

## Machine State

- active_step: `DD-P4-S1`
- latest_completed_step: `MASTER-WRITEBACK-P4-ACTIVATION`
- intended_handoff: `execute-plan`
- active_concrete_pack: `data-dyna-external-producer-integration`
- latest_plan_summary: Created the concrete P4 external producer integration pack after P3 observability closeout.
- latest_verification:
  - `data-dyna-observability-foundation STATUS/WORKSET are PACK_COMPLETE with done=5 pending=0.`
  - `Master tracker writeback marks DD-PR-MASTER-P3 done and activates DD-PR-MASTER-P4.`
  - `Concrete P4 external producer integration pack is now the active README pack with DD-P4-S1 ready for execute-plan.`
