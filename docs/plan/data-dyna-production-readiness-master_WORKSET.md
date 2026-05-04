# data-dyna Production Readiness Master Workset

## Stage Order

- [x] `DD-PR-MASTER-P2` activate and close P2-lite auth/tenancy foundation
- [x] `DD-PR-MASTER-P3` create observability foundation pack after P2
- [x] `DD-PR-MASTER-P4` create external producer integration pack after P2/P3
- [x] `DD-PR-MASTER-P5` create durable worker queue foundation pack after P4
- [ ] `DD-PR-MASTER-P6` create Agent runtime integration pack last
- [ ] `DD-PR-MASTER-CLOSEOUT-S1` P2-P6 production-readiness master closeout

## Active Stage

### `DD-PR-MASTER-P6`

- Owner: `execute-plan`
- State: `READY`
- Priority: `high`

目标：

- Keep the master tracker aligned while the concrete `data-dyna-agent-runtime-integration` pack implements controlled Agent runtime integration after accepted P5 durable worker evidence.

必须交付：

1. Concrete P6 pack defines and implements prepared context attempts, provider/runtime fail-closed policy, tool-policy enforcement, validator/merchant-review gates, and Agent audit evidence.
2. Agent tests prove output remains draft/hypothesis, cannot write Core fact tables, cannot bypass validator, cannot bypass merchant review, and cannot call forbidden mutation tools.
3. Production dashboarding, paging, mature SLOs, incident management, cloud secrets, deployment hardening, and production model operations remain deferred until successor/ops packs own them.

done_when:

1. Concrete P6 pack reaches `PACK_COMPLETE` with accepted Agent runtime evidence.
2. Agent cannot write Core fact tables, bypass validator, bypass merchant review, or call forbidden mutation tools.
3. Master tracker writeback marks `DD-PR-MASTER-P6` done and activates `DD-PR-MASTER-CLOSEOUT-S1`.

stop_boundary:

1. Stop if Agent becomes a fact source or direct business mutation actor.
2. Stop if provider failures, costs, prompts, tool decisions, or run lifecycle are not auditable.
3. Stop if tool allowlist enforcement is not testable.
4. Stop if P6 consumes non-durable, stale, dead-lettered, or tenant-mismatched worker facts.

必须避免：

1. Do not use LLM claims as evidence records.
2. Do not let Agent runtime bypass P2/P3/P5 proof or P5 worker freshness gates.
3. Do not hide production provider/dashboard/SLO/incident/cloud residuals.

## Master Execution Contract

- This workset is a lightweight tracker, not the active implementation queue.
- Active concrete implementation currently belongs to `docs/plan/data-dyna-agent-runtime-integration_WORKSET.md`.
- When a concrete pack closes, route `master_plan` / `plan-creator` and update this workset in the same parser-truth turn that creates or activates the next concrete pack.
- P6 details are now bounded by the concrete P6 pack; do not expand production operations beyond that pack's accepted slices.
- A completed concrete-pack `closeout/done` is a handoff to master writeback, not a signal to restart the completed pack.

## P2-P6 Boundary Summary

- P2 owns auth/tenancy and tenant-safe writes before real producer traffic; P2 is complete and remains terminal unless reopened by explicit replan.
- P3 owns observability and redaction before runtime expansion; P3 is complete and remains terminal unless reopened by explicit replan.
- P4 owns one smallest real producer path after P2/P3 evidence; P4 is complete via `data-dyna-external-producer-integration`.
- P5 owns durable worker execution after real event flow exists; P5 is complete via `data-dyna-durable-worker-foundation`.
- P6 owns controlled Agent runtime last, with no fact-source or direct-mutation authority, and is active via `data-dyna-agent-runtime-integration`.

## Successor Activation Ladder

| Master stage | Concrete pack owner | Required predecessor evidence | Accepted closeout next master action |
|---|---|---|---|
| `DD-PR-MASTER-P2` | `data-dyna-auth-tenancy-foundation` | P1-lite `PACK_COMPLETE` | done; P3 pack activated |
| `DD-PR-MASTER-P3` | `data-dyna-observability-foundation` | P2 `PACK_COMPLETE` | done; P4 pack activated |
| `DD-PR-MASTER-P4` | `data-dyna-external-producer-integration` | P3 `PACK_COMPLETE` | mark P4 done; create/activate P5 pack |
| `DD-PR-MASTER-P5` | `data-dyna-durable-worker-foundation` | P4 `PACK_COMPLETE` | done; P6 pack activated |
| `DD-PR-MASTER-P6` | `data-dyna-agent-runtime-integration` | P5 `PACK_COMPLETE` | mark P6 done; activate master closeout |

## Machine Queue

- active_step: `DD-PR-MASTER-P6`
- latest_completed_step: `DD-PR-MASTER-P5`
- intended_handoff: `execute-plan`
- active_concrete_pack: `data-dyna-agent-runtime-integration`
- latest_closeout_summary: P5 durable worker foundation closed; P6 Agent runtime integration is now the active concrete successor pack.
- latest_verification:
  - `data-dyna-durable-worker-foundation STATUS/WORKSET are PACK_COMPLETE with done=7 pending=0.`
  - `P5 residuals and P6 successor handoff are preserved in docs/workers/p6-agent-runtime-handoff.md, docs/workers/durable-worker-foundation.md, src/app/workers/README.md, and docs/plan.`
  - `Concrete P6 Agent runtime integration pack is now the active README pack with DD-P6-S1 ready for execute-plan.`
