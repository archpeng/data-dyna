# data-dyna Production Readiness Master Status

## Current State

- state: `READY`
- owner: `plan-creator`
- route: `MASTER TRACKER -> CONCRETE PACKS -> REVIEW -> MASTER WRITEBACK -> CLOSEOUT`
- workstream: `data-dyna-production-readiness-master`
- pack_mode: `single-root docs/plan lightweight master tracker`
- source_truth: `docs/roadmap/data-dyna-production-readiness-roadmap.md`, completed P1-lite testable runtime deployment pack, completed P2 auth/tenancy pack, completed P3 observability pack, active P4 external producer integration pack

## Current Step

- active_step: `DD-PR-MASTER-P4`
- active_wave: `master-p4`
- mode: `tracking-active-concrete-pack`
- intended_handoff: `plan-creator`

## Planned Stages

- [x] `DD-PR-MASTER-P2` activate and close P2-lite auth/tenancy foundation
- [x] `DD-PR-MASTER-P3` create observability foundation pack after P2
- [ ] `DD-PR-MASTER-P4` create external producer integration pack after P2/P3
- [ ] `DD-PR-MASTER-P5` create durable worker queue foundation pack after P4
- [ ] `DD-PR-MASTER-P6` create Agent runtime integration pack last
- [ ] `DD-PR-MASTER-CLOSEOUT-S1` P2-P6 production-readiness master closeout

## Immediate Focus

### `DD-PR-MASTER-P4`

- Owner: `plan-creator`
- State: `READY`
- Priority: `high`

目标：

- Keep the master tracker aligned while the concrete `data-dyna-external-producer-integration` pack plans and implements one smallest producer path into `/events` after P2/P3 evidence.

必须交付：

1. Concrete P4 pack chooses one pilot producer path instead of integrating POS, miniapp, mobile-hq, and backend facts all at once.
2. Producer contract includes source-to-target mapping, idempotency key generation, retry/backfill policy, and non-blocking producer failure behavior.
3. Contract tests prove producer fixtures can enter `raw_events` safely.

done_when:

1. Concrete P4 pack reaches `PACK_COMPLETE` with at least one accepted real-producer path or an explicit residual explaining why unavailable.
2. Tenant/source/correlation/idempotency fields are sufficient for downstream workers.
3. Master tracker writeback marks `DD-PR-MASTER-P4` done and activates `DD-PR-MASTER-P5`.

stop_boundary:

1. Stop if real producer data would bypass P2 auth/tenancy or P3 observability.
2. Stop if producer sending can block POS/payment/refund primary flows.
3. Stop if mapping relies on PostHog/Aegis/logs as operating-fact sources.

必须避免：

1. Do not integrate every producer in one pack.
2. Do not let Agent runtime consume unvalidated producer facts.

## Master Tracker Notes

- This master pack is intentionally lightweight. It preserves order and boundaries; concrete implementation details belong in the active concrete pack.
- The active concrete pack is `data-dyna-external-producer-integration`.
- After each concrete pack reaches `PACK_COMPLETE`, route `master_plan` / `plan-creator` to update this tracker and create or activate the next concrete pack.
- P2 auth/tenancy is complete and remains terminal unless reopened by explicit replan.
- P3 observability/redaction is complete and remains terminal unless reopened by explicit replan.
- P4 external producer integration is now active and starts with the POS order-paid pilot path.
- P5/P6 must remain queued until predecessor closeout evidence exists.

## Latest Master Writeback Evidence

- `data-dyna-observability-foundation` reached `PACK_COMPLETE` with accepted P3 closeout evidence.
- P3 evidence covers redaction-safe structured logs, bounded metrics/counters, local/test query notes, targeted probe, parser-truth closeout, and residual handoff.
- `docs/plan/README.md` now activates `data-dyna-external-producer-integration` with active slice `DD-P4-S1` owned by `execute-plan`.
- `data-dyna-external-producer-integration` chooses POS order-paid (`source: pos`, `domain: transaction_scene`, `name: pos.order_paid`) as the first pilot producer path.

## Machine State

- active_step: `DD-PR-MASTER-P4`
- latest_completed_step: `DD-PR-MASTER-P3`
- intended_handoff: `plan-creator`
- active_concrete_pack: `data-dyna-external-producer-integration`
- latest_plan_summary: Marked P3 master stage done and activated P4 external producer integration as the next concrete pack.
- latest_verification:
  - `data-dyna-observability-foundation STATUS/WORKSET are PACK_COMPLETE with done=5 pending=0.`
  - `P3 residuals and P4 successor recommendation are preserved in docs/plan, docs/observability/runtime-observability-foundation.md, and docs/deployment/testable-runtime-deployment.md.`
  - `Concrete P4 external producer integration pack is now the active README pack with DD-P4-S1 ready for execute-plan.`
