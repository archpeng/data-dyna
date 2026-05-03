# data-dyna Observability Foundation Status

## Current State

- state: `READY`
- owner: `execute-plan`
- route: `PLAN -> EXEC -> REVIEW -> REPLAN -> CLOSEOUT`
- workstream: `data-dyna-observability-foundation`
- pack_mode: `single-root docs/plan machine-compatible active-pack`
- source_truth: `docs/roadmap/data-dyna-production-readiness-roadmap.md`, completed P2 auth/tenancy pack, `docs/security/auth-tenancy-foundation.md`, runtime event/auth surfaces

## Current Step

- active_step: `DD-P3-S1`
- active_wave: `wave-1`
- mode: `ready_for_execute`
- intended_handoff: `execute-plan`

## Planned Stages

- [ ] `DD-P3-S1` observability contract and redaction map
- [ ] `DD-P3-S2` structured runtime logging and correlation
- [ ] `DD-P3-S3` ingestion metrics and runtime counters
- [ ] `DD-P3-S4` observability runbook, alert/query notes, and smoke coverage
- [ ] `DD-P3-CLOSEOUT-S1` P3 closeout audit

## Immediate Focus

### `DD-P3-S1`

- Owner: `execute-plan`
- State: `READY`
- Priority: `high`

目标：

- Define the minimum P3 observability contract before runtime instrumentation changes.

必须交付：

1. A source-of-truth observability document covering structured logs, counters/metrics, correlation IDs, alert/query notes, and redaction rules.
2. A safe field map from P2 auth/tenant context to logs/metrics/traces that excludes tokens, secrets, raw payload PII, and merchant-sensitive details.
3. A slice-by-slice implementation and validation ladder for the remaining P3 work.

done_when:

1. `docs/observability/runtime-observability-foundation.md` exists and names the P3 log, metric, correlation, alert/query, and redaction contract.
2. The contract maps P2 credential/tenant/source fields to safe observability fields without token or raw payload leakage.
3. P4/P5/P6 work remains residual and is not implemented inside P3-S1.
4. `npm run check:plan` and `git diff --check` pass.

stop_boundary:

1. Stop if the contract requires logging tokens, secrets, raw payload PII, or merchant-sensitive payload details.
2. Stop if the minimum observability proof depends on vendor infrastructure that cannot be locally tested or explicitly deferred.
3. Stop if P4 producer integration, P5 durable workers, or P6 Agent runtime starts inside this slice.

必须避免：

1. Do not make dashboard polish or mature SLOs a P3-S1 blocker.
2. Do not add runtime instrumentation before the redaction contract is explicit.

## Current Technical Consensus

- P3 starts after accepted P2 auth/tenancy evidence; it must use P2 tenant/credential context safely, not redefine auth.
- Minimal local/test observability is required before wider runtime expansion and real producer traffic growth.
- P3 should prefer small in-repo log/counter abstractions and tests over vendor-specific infrastructure.
- Redaction is part of the acceptance criteria, not a later polish item.
- P4/P5/P6 remain residual until P3 closeout.

## Expected Validation Ladder

Always run after parser-truth edits:

```bash
npm run check:plan
git diff --check
```

Escalate as P3 implementation slices add runtime code:

```bash
npm run test:runtime
npm run check:boundaries
npm run typecheck
npm test
```

Run Docker/runtime smoke when P3 changes the smoke path or runbook requires fresh proof:

```bash
npm run db:test:up
npm run test:db:migrations
npm run docker:build
npm run smoke:runtime
```

## Blockers

- None currently known.

## Residuals / Notes

- P3 does not complete P4 external producer integration, P5 durable worker queue, or P6 Agent runtime.
- P3 does not complete production observability backend selection, mature SLOs, full incident-management process, cloud deployment hardening, or production secret management.
- The recommended next concrete pack after P3 closeout is P4 external producer integration, gated by redaction-safe observability evidence.

## Master Writeback Evidence

- `data-dyna-auth-tenancy-foundation` reached `PACK_COMPLETE` with accepted P2 review/closeout evidence.
- P2 residuals explicitly preserve P3 observability/redaction, P4 producer integration, P5 durable workers, P6 Agent runtime, full IAM, cloud secret management, and deployment hardening.
- Master tracker writeback marks `DD-PR-MASTER-P2` done and activates `DD-PR-MASTER-P3`; this pack is the concrete P3 execution queue.

## Machine State

- active_step: `DD-P3-S1`
- latest_completed_step: `DD-PR-MASTER-P2 writeback after P2 PACK_COMPLETE`
- intended_handoff: `execute-plan`
- latest_plan_summary: Created P3 observability foundation pack and activated DD-P3-S1.
- latest_verification:
  - `P2 auth/tenancy pack is PACK_COMPLETE with STATUS/WORKSET done=6 pending=0.`
  - `P3 pack created as the active README pack with DD-P3-S1 owned by execute-plan.`
  - `Master tracker now marks DD-PR-MASTER-P2 done and tracks DD-PR-MASTER-P3 as the active concrete-pack stage.`
