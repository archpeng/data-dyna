# data-dyna Auth / Tenancy Foundation Workset

## Stage Order

- [ ] `DD-P2-S1` auth/tenancy contract and implementation map
- [ ] `DD-P2-S2` tenant storage and idempotency safety
- [ ] `DD-P2-S3` runtime request auth boundary
- [ ] `DD-P2-S4` tenant-safe event writes and negative tests
- [ ] `DD-P2-S5` P2 runtime smoke and runbook update
- [ ] `DD-P2-CLOSEOUT-S1` P2 closeout audit

## Active Stage

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

## Slice Ownership

### `DD-P2-S1`

- Allowed repo surfaces:
  - `docs/security/auth-tenancy-foundation.md`.
  - `docs/plan/*` parser-truth writeback only if needed for planning correction.
- Disallowed surfaces:
  - Runtime auth implementation unless a tiny proof is required and remains bounded.
  - Schema migrations.
  - External producer adapters.
  - P3/P4/P5/P6 implementation.

### `DD-P2-S2`

- Allowed repo surfaces:
  - `migrations/**` for tenant/idempotency storage changes.
  - `src/app/repositories/postgres-raw-event-repository.ts`.
  - `src/ingestion/raw-event-store.ts` only if the store contract must expose tenant-safe fields.
  - Repository and migration tests.
- Disallowed surfaces:
  - Auth framework code.
  - Producer integrations.
  - Projection/snapshot/benchmark/evidence behavior outside tenant key compatibility.

### `DD-P2-S3`

- Allowed repo surfaces:
  - `src/app/auth/**` or the smallest equivalent app-layer auth module.
  - `src/app/http/events-route.ts`.
  - `src/app/config/**` and `.env.example` for local/test credential contract.
  - Runtime tests.
- Disallowed surfaces:
  - OAuth/SSO/IAM framework integration.
  - External identity provider network calls.
  - Real secret management implementation.

### `DD-P2-S4`

- Allowed repo surfaces:
  - `src/app/http/events-route.ts`.
  - `src/ingestion/**` only for tenant-safe accepted/invalid handling required by the contract.
  - `src/app/repositories/postgres-raw-event-repository.ts` only for tenant-safe persistence integration.
  - Runtime/repository tests for cross-tenant negatives.
- Disallowed surfaces:
  - P4 producer adapters.
  - P5 durable queue logic.
  - P6 Agent runtime.

### `DD-P2-S5`

- Allowed repo surfaces:
  - `scripts/smoke-runtime.mjs`.
  - `docs/deployment/testable-runtime-deployment.md`.
  - `.env.example` placeholder-only P2 variables.
  - Runtime smoke fixtures.
- Disallowed surfaces:
  - Production secrets.
  - Cloud infrastructure.
  - Observability/product integration/Agent implementation.

### `DD-P2-CLOSEOUT-S1`

- Allowed repo surfaces:
  - `docs/plan/*` parser-truth writeback.
  - Final P2 audit notes and residual handoff.
  - Master tracker update recommendation.
- Disallowed surfaces:
  - New implementation outside reviewed P2 evidence.
  - Hidden IAM/secret-management claims.
  - P3/P4/P5/P6 implementation.

## Continuous Wave Ladder

| Order | Slice | Phase loop | Accepted-review next step |
|---|---|---|---|
| 1 | `DD-P2-S1` | `execute -> review` | activate `DD-P2-S2` |
| 2 | `DD-P2-S2` | `execute -> review` | activate `DD-P2-S3` |
| 3 | `DD-P2-S3` | `execute -> review` | activate `DD-P2-S4` |
| 4 | `DD-P2-S4` | `execute -> review` | activate `DD-P2-S5` |
| 5 | `DD-P2-S5` | `execute -> review` | activate `DD-P2-CLOSEOUT-S1` |
| 6 | `DD-P2-CLOSEOUT-S1` | `review -> accepted-writeback` | activate `PACK_COMPLETE` or P3 successor pack |

`currentWave/maxWaves` or any scheduler wave count is not objective-completion proof; only parser truth and accepted review evidence can permit terminal closeout.

## Expected Verification

General validation escalation:

```bash
npm run check:plan
git diff --check
npm run test:db:migrations
npm run test:app:repository
npm run test:runtime
npm run check:boundaries
npm run check:schema-migrations
npm run typecheck
npm test
```

Docker/runtime validation for later slices:

```bash
npm run docker:build
npm run smoke:runtime
```

For plan/parser checks:

```bash
plan_sync /home/peng/dt-git/github/data-dyna/docs/plan
find docs/plan -maxdepth 1 -type f -name '*.md' -print | sort
```

## Execution Notes

- This pack is active because P1-lite reached `PACK_COMPLETE` and P2 auth/tenancy is the next required safety gate before real producer traffic.
- `DD-P2-S1` is contract-first to avoid silently guessing the credential model, tenant mismatch behavior, or schema semantics.
- Accepted review is the only normal point where `README` / `STATUS` / `WORKSET` should advance to the next stage.
- If a slice requires full IAM, OAuth/SSO, external identity infrastructure, real producer integration, observability SDKs, durable worker queues, or Agent runtime ownership, route `needs_replan` rather than expanding P2.

## Residual Queue

Known out-of-scope residuals for this P2 pack:

- P3: structured logs, metrics, traces, alerts, dashboards/query notes, and redaction policy.
- P4: POS, miniapp, mobile-hq, or backend producer instrumentation.
- P5: durable worker queue, retries, checkpoints, dead letters, and idempotent background processing.
- P6: full Agent runtime, real Pi provider integration, provider audit, validator/merchant-review runtime governance.
- Full IAM/OAuth/SSO/admin UI/self-service merchant permissions.
- Cloud production secret management and deployment hardening beyond local/test env contract.

## Machine Queue

- active_step: `DD-P2-S1`
- latest_completed_step: `data-dyna-testable-runtime-deployment PACK_COMPLETE`
- intended_handoff: `execute-plan`
- latest_plan_summary: Created P2-lite auth/tenancy foundation pack and activated DD-P2-S1.
- latest_verification:
  - `P1-lite testable runtime deployment is PACK_COMPLETE and pushed at commit 6c11098.`
  - `P2-P6 master tracker exists as docs/plan/data-dyna-production-readiness-master_*.md.`
  - `DD-P2-S1 is ready to execute as a contract-first slice before auth code changes.`
