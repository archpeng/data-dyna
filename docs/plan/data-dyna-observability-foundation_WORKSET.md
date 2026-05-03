# data-dyna Observability Foundation Workset

## Stage Order

- [ ] `DD-P3-S1` observability contract and redaction map
- [ ] `DD-P3-S2` structured runtime logging and correlation
- [ ] `DD-P3-S3` ingestion metrics and runtime counters
- [ ] `DD-P3-S4` observability runbook, alert/query notes, and smoke coverage
- [ ] `DD-P3-CLOSEOUT-S1` P3 closeout audit

## Active Stage

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

## Slice Ownership

### `DD-P3-S1`

- Allowed repo surfaces:
  - `docs/observability/runtime-observability-foundation.md`.
  - `docs/plan/*` parser-truth writeback only if needed for planning correction.
- Disallowed surfaces:
  - Runtime instrumentation implementation unless a tiny proof is required and remains bounded.
  - Vendor-specific observability infrastructure.
  - P4/P5/P6 implementation.

### `DD-P3-S2`

- Allowed repo surfaces:
  - `src/app/observability/**` or the smallest equivalent app-layer logging module.
  - `src/app/app.ts`, `src/app/http/events-route.ts`, and runtime request seams needed for correlation/logging.
  - Runtime tests for safe structured logging and redaction.
- Disallowed surfaces:
  - Deterministic Core imports of Fastify, `pg` pool construction, logger framework code, or auth framework code.
  - Changing P2 auth/tenancy behavior for logging convenience.
  - P4 producer adapters, P5 durable queues, or P6 Agent runtime.

### `DD-P3-S3`

- Allowed repo surfaces:
  - `src/app/observability/**` or a small runtime metrics/counter module.
  - `src/app/http/events-route.ts` and ingestion response seams needed for bounded counters.
  - Runtime tests for success, duplicate, invalid schema, unauthorized, and tenant mismatch counters.
- Disallowed surfaces:
  - Cloud metrics backends required for local validation.
  - High-cardinality metric labels from tokens, event IDs, idempotency keys, or raw payload values.
  - Changes to accepted event semantics.

### `DD-P3-S4`

- Allowed repo surfaces:
  - `docs/observability/runtime-observability-foundation.md`.
  - `docs/deployment/testable-runtime-deployment.md` only for P3 local/test observability runbook additions.
  - `scripts/smoke-runtime.mjs` only if smoke is needed to prove observable outputs.
  - Runtime tests or probes for documented log/counter inspection.
- Disallowed surfaces:
  - Production secrets or real tokens.
  - Cloud infrastructure or vendor dashboard creation unless documented as optional/residual.
  - P4 producer traffic or P5/P6 implementation.

### `DD-P3-CLOSEOUT-S1`

- Allowed repo surfaces:
  - `docs/plan/*` parser-truth writeback.
  - Final P3 audit notes and residual handoff.
  - Master tracker update recommendation.
- Disallowed surfaces:
  - New implementation outside reviewed P3 evidence.
  - Hidden production observability/backend/SLO claims.
  - P4/P5/P6 implementation.

## Continuous Wave Ladder

| Order | Slice | Phase loop | Accepted-review next step |
|---|---|---|---|
| 1 | `DD-P3-S1` | `execute -> review` | activate `DD-P3-S2` |
| 2 | `DD-P3-S2` | `execute -> review` | activate `DD-P3-S3` |
| 3 | `DD-P3-S3` | `execute -> review` | activate `DD-P3-S4` |
| 4 | `DD-P3-S4` | `execute -> review` | activate `DD-P3-CLOSEOUT-S1` |
| 5 | `DD-P3-CLOSEOUT-S1` | `review -> accepted-writeback` | activate `PACK_COMPLETE` or P4 successor pack |
| terminal | `PACK_COMPLETE` | `closeout` | repo-local closeout prompt surface, then master_plan writeback for P4 |

`currentWave/maxWaves` or any scheduler wave count is not objective-completion proof; only parser truth and accepted review evidence can permit terminal closeout.

## Expected Verification

General validation escalation:

```bash
npm run check:plan
git diff --check
npm run test:runtime
npm run check:boundaries
npm run typecheck
npm test
```

Docker/runtime validation when smoke or runbook changes require it:

```bash
npm run db:test:up
npm run test:db:migrations
npm run docker:build
npm run smoke:runtime
```

For plan/parser checks:

```bash
plan_sync /home/peng/dt-git/github/data-dyna/docs/plan
find docs/plan -maxdepth 1 -type f -name '*.md' -print | sort
```

## Execution Notes

- This pack is active because P2 auth/tenancy reached `PACK_COMPLETE` and P3 observability is the next required safety gate before wider runtime expansion.
- `DD-P3-S1` is contract-first to avoid silently logging sensitive P2 credential, tenant, or event payload data.
- Accepted review is the only normal point where `README` / `STATUS` / `WORKSET` should advance to the next stage.
- If a slice requires real producer integration, durable queue semantics, Agent runtime ownership, production observability vendor setup, mature SLOs, or cloud deployment hardening, route `needs_replan` rather than expanding P3.

## Residual Queue

Known out-of-scope residuals for this P3 pack:

- P4: POS, miniapp, mobile-hq, or backend producer instrumentation.
- P5: durable worker queue, retries, checkpoints, dead letters, and idempotent background processing.
- P6: full Agent runtime, real Pi provider integration, provider audit, validator/merchant-review runtime governance.
- Full production observability backend selection, dashboards, paging policy, mature SLO/incident-management process, and capacity planning.
- Cloud production secret management and deployment hardening beyond local/test env contract.
- Master tracker follow-up: mark `DD-PR-MASTER-P3` done and activate `DD-PR-MASTER-P4` after this terminal pack is persisted.

## Machine Queue

- active_step: `DD-P3-S1`
- latest_completed_step: `DD-PR-MASTER-P2 writeback after P2 PACK_COMPLETE`
- intended_handoff: `execute-plan`
- latest_closeout_summary: P2 auth/tenancy closed and P3 observability foundation activated.
- latest_verification:
  - `P2 auth/tenancy pack is PACK_COMPLETE with STATUS/WORKSET done=6 pending=0.`
  - `P3 pack created as the active README pack with DD-P3-S1 owned by execute-plan.`
  - `Master tracker now marks DD-PR-MASTER-P2 done and tracks DD-PR-MASTER-P3 as the active concrete-pack stage.`
