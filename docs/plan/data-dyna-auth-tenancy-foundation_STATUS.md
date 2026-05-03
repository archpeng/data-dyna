# data-dyna Auth / Tenancy Foundation Status

## Current State

- state: `READY`
- owner: `execute-plan`
- route: `PLAN -> EXEC -> REVIEW -> REPLAN -> CLOSEOUT`
- workstream: `data-dyna-auth-tenancy-foundation`
- pack_mode: `single-root docs/plan machine-compatible active-pack`
- source_truth: `docs/roadmap/data-dyna-production-readiness-roadmap.md`, `docs/plan/data-dyna-production-readiness-master_PLAN.md`, completed P1-lite testable runtime deployment pack, runtime event contract and PostgreSQL raw event repository

## Current Step

- active_step: `DD-P2-S1`
- active_wave: `wave-1`
- mode: `ready_for_execute`
- intended_handoff: `execute-plan`

## Planned Stages

- [ ] `DD-P2-S1` auth/tenancy contract and implementation map
- [ ] `DD-P2-S2` tenant storage and idempotency safety
- [ ] `DD-P2-S3` runtime request auth boundary
- [ ] `DD-P2-S4` tenant-safe event writes and negative tests
- [ ] `DD-P2-S5` P2 runtime smoke and runbook update
- [ ] `DD-P2-CLOSEOUT-S1` P2 closeout audit

## Immediate Focus

### `DD-P2-S1`

- Owner: `execute-plan`
- State: `READY`
- Priority: `critical`

目标：

- Write the P2-lite source-of-truth contract before coding auth behavior, so request identity, tenant identity, schema impact, and test expectations are explicit.

必须交付：

1. `docs/security/auth-tenancy-foundation.md` defining the minimal auth model, accepted credential shape, tenant identity source, request failure behavior, and local/test env variables.
2. A concrete implementation map naming the exact files/surfaces later P2 slices may change.
3. Explicit decisions for `merchantId`, `storeId`, `producer.service`, `producer.environment`, `source`, and idempotency scope safety.
4. Validation ladder for P2 implementation and review.

done_when:

1. `docs/security/auth-tenancy-foundation.md` exists and defines the canonical P2-lite auth/tenancy contract.
2. The contract explains how missing credentials, invalid credentials, tenant mismatch, missing tenant identity, and idempotency collisions must behave.
3. The contract names allowed implementation surfaces and preserves P3/P4/P5/P6 residuals.
4. `npm run check:plan` and `git diff --check` pass.

stop_boundary:

1. Stop if the contract requires full IAM, OAuth, SSO, admin UI, or external secret infrastructure.
2. Stop if the contract would admit real producer traffic before tenant-safe writes are implemented and tested.
3. Stop if schema decisions require migration changes not captured for `DD-P2-S2`.

必须避免：

1. Do not implement runtime auth in this slice unless required to make the contract testable and still bounded.
2. Do not invent compatibility aliases for multiple credential systems.
3. Do not hide P3/P4/P5/P6 residuals.

## Current Technical Consensus

- P2-lite is a minimum safety gate before real producer traffic.
- Prefer one simple credential boundary over multiple auth systems.
- Tenant identity must be explicit enough to protect `raw_events` and future projections.
- Existing P1 runtime smoke remains valid but must be updated once auth becomes required.
- P3/P4/P5/P6 remain residuals until P2 closeout.

## Expected Validation Ladder

Always run after parser-truth edits:

```bash
npm run check:plan
git diff --check
```

Escalate as P2 implementation slices add code or migrations:

```bash
npm run test:db:migrations
npm run test:app:repository
npm run test:runtime
npm run check:boundaries
npm run check:schema-migrations
npm run typecheck
npm test
```

Docker/runtime validation returns once P2 smoke is updated:

```bash
npm run docker:build
npm run smoke:runtime
```

## Blockers

- None currently known.

## Residuals / Notes

- P2 does not complete P3 observability, P4 external producer integration, P5 durable worker queue, or P6 Agent runtime.
- P2 does not complete full IAM, OAuth, SSO, self-service permissions, or cloud secret management.
- The recommended next concrete pack after P2 closeout is P3 observability foundation.

## Machine State

- active_step: `DD-P2-S1`
- latest_completed_step: `data-dyna-testable-runtime-deployment PACK_COMPLETE`
- intended_handoff: `execute-plan`
- latest_plan_summary: Created P2-lite auth/tenancy foundation pack and activated DD-P2-S1.
- latest_verification:
  - `P1-lite testable runtime deployment is PACK_COMPLETE and pushed at commit 6c11098.`
  - `P2-P6 master tracker exists as docs/plan/data-dyna-production-readiness-master_*.md.`
  - `DD-P2-S1 is ready to execute as a contract-first slice before auth code changes.`
