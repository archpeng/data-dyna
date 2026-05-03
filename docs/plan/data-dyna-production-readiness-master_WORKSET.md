# data-dyna Production Readiness Master Workset

## Stage Order

- [x] `DD-PR-MASTER-P2` activate and close P2-lite auth/tenancy foundation
- [ ] `DD-PR-MASTER-P3` create observability foundation pack after P2
- [ ] `DD-PR-MASTER-P4` create external producer integration pack after P2/P3
- [ ] `DD-PR-MASTER-P5` create durable worker queue foundation pack after P4
- [ ] `DD-PR-MASTER-P6` create Agent runtime integration pack last
- [ ] `DD-PR-MASTER-CLOSEOUT-S1` P2-P6 production-readiness master closeout

## Active Stage

### `DD-PR-MASTER-P3`

- Owner: `plan-creator`
- State: `READY`
- Priority: `high`

目标：

- Keep the master tracker aligned while the concrete `data-dyna-observability-foundation` pack implements the P3 observability gate after P2 clarified tenant identity, request identity, and redaction constraints.

必须交付：

1. Concrete P3 pack exists with bounded slices for structured logging, metrics, trace/correlation, alert/query notes, and redaction tests.
2. P3 pack names exact validation commands and avoids broad incident-management scope.
3. P4 producer integration remains queued until P3 evidence is accepted or explicitly risk-accepted.

done_when:

1. Concrete P3 pack reaches `PACK_COMPLETE` with accepted observability evidence.
2. Runtime health/error/latency/event-ingestion visibility is auditable without leaking tokens or PII.
3. Master tracker writeback marks `DD-PR-MASTER-P3` done and activates `DD-PR-MASTER-P4`.

stop_boundary:

1. Stop if observability logs secrets, tokens, or sensitive merchant/customer details.
2. Stop if P3 adds vendor-specific infrastructure that cannot be tested locally or documented as a residual.
3. Stop if P4 real producer integration starts before minimum observability evidence exists.

必须避免：

1. Do not make dashboard polish a blocker for minimal runtime safety.
2. Do not claim mature SLO/incident management unless implemented and tested.

## Master Execution Contract

- This workset is a lightweight tracker, not the active implementation queue.
- Active concrete implementation currently belongs to `docs/plan/data-dyna-observability-foundation_WORKSET.md`.
- When a concrete pack closes, route `master_plan` / `plan-creator` and update this workset in the same parser-truth turn that creates or activates the next concrete pack.
- Do not expand later P4-P6 details until predecessor closeout evidence exists.
- A completed concrete-pack `closeout/done` is a handoff to master writeback, not a signal to restart the completed pack.

## P2-P6 Boundary Summary

- P2 owns auth/tenancy and tenant-safe writes before real producer traffic; P2 is complete and remains terminal unless reopened by explicit replan.
- P3 owns observability and redaction before runtime expansion; P3 is the active concrete pack.
- P4 owns one smallest real producer path after P2/P3 evidence.
- P5 owns durable worker execution after real event flow exists.
- P6 owns controlled Agent runtime last, with no fact-source or direct-mutation authority.

## Successor Activation Ladder

| Master stage | Concrete pack owner | Required predecessor evidence | Accepted closeout next master action |
|---|---|---|---|
| `DD-PR-MASTER-P2` | `data-dyna-auth-tenancy-foundation` | P1-lite `PACK_COMPLETE` | done; P3 pack activated |
| `DD-PR-MASTER-P3` | `data-dyna-observability-foundation` | P2 `PACK_COMPLETE` | mark P3 done; create/activate P4 pack |
| `DD-PR-MASTER-P4` | future concrete producer pack | P3 `PACK_COMPLETE` | mark P4 done; create/activate P5 pack |
| `DD-PR-MASTER-P5` | future concrete durable-worker pack | P4 `PACK_COMPLETE` | mark P5 done; create/activate P6 pack |
| `DD-PR-MASTER-P6` | future concrete Agent-runtime pack | P5 `PACK_COMPLETE` | mark P6 done; activate master closeout |

## Machine Queue

- active_step: `DD-PR-MASTER-P3`
- latest_completed_step: `DD-PR-MASTER-P2`
- intended_handoff: `plan-creator`
- active_concrete_pack: `data-dyna-observability-foundation`
- latest_closeout_summary: P2 auth/tenancy closed; P3 observability foundation is now the active concrete successor pack.
- latest_verification:
  - `data-dyna-auth-tenancy-foundation STATUS/WORKSET are PACK_COMPLETE with done=6 pending=0.`
  - `P2 residuals and P3 successor recommendation are preserved in docs/plan and docs/deployment/testable-runtime-deployment.md.`
  - `Concrete P3 observability pack is now the active README pack with DD-P3-S1 ready for execute-plan.`
