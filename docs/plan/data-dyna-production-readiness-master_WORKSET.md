# data-dyna Production Readiness Master Workset

## Stage Order

- [x] `DD-PR-MASTER-P2` activate and close P2-lite auth/tenancy foundation
- [x] `DD-PR-MASTER-P3` create observability foundation pack after P2
- [x] `DD-PR-MASTER-P4` create external producer integration pack after P2/P3
- [ ] `DD-PR-MASTER-P5` create durable worker queue foundation pack after P4
- [ ] `DD-PR-MASTER-P6` create Agent runtime integration pack last
- [ ] `DD-PR-MASTER-CLOSEOUT-S1` P2-P6 production-readiness master closeout

## Active Stage

### `DD-PR-MASTER-P5`

- Owner: `plan-creator`
- State: `READY`
- Priority: `high`

目标：

- Keep the master tracker aligned while the concrete `data-dyna-durable-worker-foundation` pack plans durable worker execution, recovery, observability, and P6 handoff after P4 producer evidence.

必须交付：

1. Concrete P5 pack chooses the simplest durable execution model and names its job/checkpoint/dead-letter schema.
2. Worker tests cover bounded batch processing, retries, checkpoints, dead letters, and idempotent writes.
3. Agent runtime, Pi provider integration, production dashboarding, paging, mature SLOs, and incident management remain deferred until successor packs own them.

done_when:

1. Concrete P5 pack reaches `PACK_COMPLETE` with accepted worker durability evidence.
2. Raw event to projection/snapshot/benchmark/evidence refresh has auditable job records.
3. Master tracker writeback marks `DD-PR-MASTER-P5` done and activates `DD-PR-MASTER-P6`.

stop_boundary:

1. Stop if worker failure can silently drop data.
2. Stop if worker reruns are not idempotent.
3. Stop if Agent runtime starts before durable worker evidence exists.
4. Stop if production dashboard/SLO/incident scope is claimed as complete inside P5.

必须避免：

1. Do not promise exactly-once processing without strict design and tests.
2. Do not build business mutation workers in this stage.
3. Do not let Agent runtime consume non-durable or unvalidated worker facts.

## Master Execution Contract

- This workset is a lightweight tracker, not the active implementation queue.
- Active concrete implementation currently belongs to `docs/plan/data-dyna-durable-worker-foundation_WORKSET.md`.
- When a concrete pack closes, route `master_plan` / `plan-creator` and update this workset in the same parser-truth turn that creates or activates the next concrete pack.
- Do not expand later P6 details until P5 closeout evidence exists.
- A completed concrete-pack `closeout/done` is a handoff to master writeback, not a signal to restart the completed pack.

## P2-P6 Boundary Summary

- P2 owns auth/tenancy and tenant-safe writes before real producer traffic; P2 is complete and remains terminal unless reopened by explicit replan.
- P3 owns observability and redaction before runtime expansion; P3 is complete and remains terminal unless reopened by explicit replan.
- P4 owns one smallest real producer path after P2/P3 evidence; P4 is complete via `data-dyna-external-producer-integration`.
- P5 owns durable worker execution after real event flow exists; P5 is active via `data-dyna-durable-worker-foundation`.
- P6 owns controlled Agent runtime last, with no fact-source or direct-mutation authority, and remains queued until P5 durability evidence exists.

## Successor Activation Ladder

| Master stage | Concrete pack owner | Required predecessor evidence | Accepted closeout next master action |
|---|---|---|---|
| `DD-PR-MASTER-P2` | `data-dyna-auth-tenancy-foundation` | P1-lite `PACK_COMPLETE` | done; P3 pack activated |
| `DD-PR-MASTER-P3` | `data-dyna-observability-foundation` | P2 `PACK_COMPLETE` | done; P4 pack activated |
| `DD-PR-MASTER-P4` | `data-dyna-external-producer-integration` | P3 `PACK_COMPLETE` | mark P4 done; create/activate P5 pack |
| `DD-PR-MASTER-P5` | `data-dyna-durable-worker-foundation` | P4 `PACK_COMPLETE` | mark P5 done; create/activate P6 pack |
| `DD-PR-MASTER-P6` | future concrete Agent-runtime pack | P5 `PACK_COMPLETE` | mark P6 done; activate master closeout |

## Machine Queue

- active_step: `DD-PR-MASTER-P5`
- latest_completed_step: `DD-PR-MASTER-P4`
- intended_handoff: `plan-creator`
- active_concrete_pack: `data-dyna-durable-worker-foundation`
- latest_closeout_summary: P4 external producer integration closed; P5 durable worker foundation is now the active concrete successor pack.
- latest_verification:
  - `data-dyna-external-producer-integration STATUS/WORKSET are PACK_COMPLETE with done=5 pending=0.`
  - `P4 residuals and P5 successor recommendation are preserved in docs/plan and P4 integration/runbook docs.`
  - `Concrete P5 durable worker foundation pack is now the active README pack with DD-P5-S1 ready for execute-plan.`
