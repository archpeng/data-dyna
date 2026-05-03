# data-dyna Production Readiness Master Workset

## Stage Order

- [x] `DD-PR-MASTER-P2` activate and close P2-lite auth/tenancy foundation
- [x] `DD-PR-MASTER-P3` create observability foundation pack after P2
- [ ] `DD-PR-MASTER-P4` create external producer integration pack after P2/P3
- [ ] `DD-PR-MASTER-P5` create durable worker queue foundation pack after P4
- [ ] `DD-PR-MASTER-P6` create Agent runtime integration pack last
- [ ] `DD-PR-MASTER-CLOSEOUT-S1` P2-P6 production-readiness master closeout

## Active Stage

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

## Master Execution Contract

- This workset is a lightweight tracker, not the active implementation queue.
- Active concrete implementation currently belongs to `docs/plan/data-dyna-external-producer-integration_WORKSET.md`.
- When a concrete pack closes, route `master_plan` / `plan-creator` and update this workset in the same parser-truth turn that creates or activates the next concrete pack.
- Do not expand later P5-P6 details until predecessor closeout evidence exists.
- A completed concrete-pack `closeout/done` is a handoff to master writeback, not a signal to restart the completed pack.

## P2-P6 Boundary Summary

- P2 owns auth/tenancy and tenant-safe writes before real producer traffic; P2 is complete and remains terminal unless reopened by explicit replan.
- P3 owns observability and redaction before runtime expansion; P3 is complete and remains terminal unless reopened by explicit replan.
- P4 owns one smallest real producer path after P2/P3 evidence; P4 is active via `data-dyna-external-producer-integration`.
- P5 owns durable worker execution after real event flow exists.
- P6 owns controlled Agent runtime last, with no fact-source or direct-mutation authority.

## Successor Activation Ladder

| Master stage | Concrete pack owner | Required predecessor evidence | Accepted closeout next master action |
|---|---|---|---|
| `DD-PR-MASTER-P2` | `data-dyna-auth-tenancy-foundation` | P1-lite `PACK_COMPLETE` | done; P3 pack activated |
| `DD-PR-MASTER-P3` | `data-dyna-observability-foundation` | P2 `PACK_COMPLETE` | done; P4 pack activated |
| `DD-PR-MASTER-P4` | `data-dyna-external-producer-integration` | P3 `PACK_COMPLETE` | mark P4 done; create/activate P5 pack |
| `DD-PR-MASTER-P5` | future concrete durable-worker pack | P4 `PACK_COMPLETE` | mark P5 done; create/activate P6 pack |
| `DD-PR-MASTER-P6` | future concrete Agent-runtime pack | P5 `PACK_COMPLETE` | mark P6 done; activate master closeout |

## Machine Queue

- active_step: `DD-PR-MASTER-P4`
- latest_completed_step: `DD-PR-MASTER-P3`
- intended_handoff: `plan-creator`
- active_concrete_pack: `data-dyna-external-producer-integration`
- latest_closeout_summary: P3 observability foundation closed; P4 external producer integration is now the active concrete successor pack.
- latest_verification:
  - `data-dyna-observability-foundation STATUS/WORKSET are PACK_COMPLETE with done=5 pending=0.`
  - `P3 residuals and P4 successor recommendation are preserved in docs/plan, docs/observability/runtime-observability-foundation.md, and docs/deployment/testable-runtime-deployment.md.`
  - `Concrete P4 external producer integration pack is now the active README pack with DD-P4-S1 ready for execute-plan.`
