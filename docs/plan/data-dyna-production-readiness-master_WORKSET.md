# data-dyna Production Readiness Master Workset

## Stage Order

- [ ] `DD-PR-MASTER-P2` activate and close P2-lite auth/tenancy foundation
- [ ] `DD-PR-MASTER-P3` create observability foundation pack after P2
- [ ] `DD-PR-MASTER-P4` create external producer integration pack after P2/P3
- [ ] `DD-PR-MASTER-P5` create durable worker queue foundation pack after P4
- [ ] `DD-PR-MASTER-P6` create Agent runtime integration pack last
- [ ] `DD-PR-MASTER-CLOSEOUT-S1` P2-P6 production-readiness master closeout

## Active Stage

### `DD-PR-MASTER-P2`

- Owner: `plan-creator`
- State: `READY`
- Priority: `critical`

目标：

- Keep the master tracker aligned while the concrete `data-dyna-auth-tenancy-foundation` pack implements the P2-lite security gate.

必须交付：

1. Active concrete P2 pack exists and owns executable P2 slices.
2. P2 closeout must prove auth/tenancy contract, tenant-safe writes, cross-tenant negative tests, and residual handoff before this master stage is marked done.
3. P3 observability pack is created or explicitly deferred after P2 evidence.

done_when:

1. `data-dyna-auth-tenancy-foundation` reaches `PACK_COMPLETE` with accepted review evidence.
2. P2 residuals and P3 successor recommendation are preserved in `docs/plan/*`.
3. Master tracker writeback marks `DD-PR-MASTER-P2` done and activates `DD-PR-MASTER-P3`.

stop_boundary:

1. Stop if P2 attempts to admit real producer traffic before auth/tenancy proof.
2. Stop if P2 changes deterministic Core facts or schema without migration tests.
3. Stop if P3/P4/P5/P6 implementation starts inside the P2 pack instead of being preserved as residuals.

必须避免：

1. Do not mark this master stage done from roadmap prose alone.
2. Do not activate P4 before P2 and P3 evidence exists.

## Master Execution Contract

- This workset is a lightweight tracker, not the active implementation queue.
- Active concrete implementation currently belongs to `docs/plan/data-dyna-auth-tenancy-foundation_WORKSET.md`.
- When a concrete pack closes, update this workset in the same parser-truth turn that creates or activates the next concrete pack.
- Do not expand later P3-P6 details until predecessor closeout evidence exists.

## P2-P6 Boundary Summary

- P2 owns auth/tenancy and tenant-safe writes before real producer traffic.
- P3 owns observability and redaction before runtime expansion.
- P4 owns one smallest real producer path after P2/P3 evidence.
- P5 owns durable worker execution after real event flow exists.
- P6 owns controlled Agent runtime last, with no fact-source or direct-mutation authority.

## Machine Queue

- active_step: `DD-PR-MASTER-P2`
- latest_completed_step: `P1-lite PACK_COMPLETE via data-dyna-testable-runtime-deployment`
- intended_handoff: `plan-creator`
- active_concrete_pack: `data-dyna-auth-tenancy-foundation`
- latest_closeout_summary: P1-lite closed and pushed; P2-lite is now the first concrete successor pack.
- latest_verification:
  - `P1-lite testable runtime deployment is PACK_COMPLETE and pushed at commit 6c11098.`
  - `P2-P6 sequence is preserved without over-specifying late-stage implementation details.`
  - `Concrete P2 auth/tenancy pack is now the active README pack.`
