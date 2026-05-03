# data-dyna Auth / Tenancy Foundation Workset

## Stage Order

- [x] `DD-P2-S1` auth/tenancy contract and implementation map
- [x] `DD-P2-S2` tenant storage and idempotency safety
- [x] `DD-P2-S3` runtime request auth boundary
- [x] `DD-P2-S4` tenant-safe event writes and negative tests
- [x] `DD-P2-S5` P2 runtime smoke and runbook update
- [x] `DD-P2-CLOSEOUT-S1` P2 closeout audit

## Active Stage

### `PACK_COMPLETE`

- Owner: `closeout`
- State: `DONE`
- Priority: `terminal`

目标：

- close the pack through the repo-local closeout prompt surface

必须交付：

1. final closeout summary and residual handoff

必须避免：

1. dispatching another execute/review phase from terminal parser truth
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
| terminal | `PACK_COMPLETE` | `closeout` | repo-local closeout prompt surface |

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
- Master tracker follow-up: mark `DD-PR-MASTER-P2` done and activate `DD-PR-MASTER-P3` after this terminal pack is persisted.

## Latest DD-P2-S3 Execution Evidence

- Added a minimal app-layer bearer-token auth module for ingestion requests.
- Parsed `DATA_DYNA_INGESTION_CREDENTIALS_JSON` into placeholder-safe local/test credentials and made event routes fail fast when credentials are missing from runtime config.
- Integrated `/events` and `/events/batch` auth checks before ingestion handlers so missing or invalid credentials return `401`, `WWW-Authenticate: Bearer`, and error code `UNAUTHORIZED` without raw-event persistence.
- Updated runtime tests to cover missing credentials, invalid credentials, and authorized valid, duplicate, invalid, and batch behavior.
- Updated the app seam README to reflect P2-lite auth without claiming full IAM/tenancy readiness.

## Latest DD-P2-S3 Review Evidence

- Review compared the accepted P2 auth contract with `src/app/auth/ingestion-auth.ts`, `src/app/config/runtime-config.ts`, `src/app/http/events-route.ts`, runtime server wiring, `.env.example`, and runtime/config tests.
- Review added missing proof for duplicate `credentialId` startup rejection plus non-Bearer and empty Bearer request rejection without persistence.
- Review verdict: accepted with successor residuals for tenant mismatch, missing tenant identity, and credential audit context flow in `DD-P2-S4`.
- Parser truth now activates `DD-P2-S4` for tenant-safe event writes and negative tests.

## Latest DD-P2-S4 Execution Evidence

- Flowed the authenticated ingestion credential into event ingestion without importing app/auth code into deterministic ingestion modules.
- Enforced P2 tenant policy before accepted persistence: missing merchant/store/environment or non-`store` idempotency scope returns `TENANT_IDENTITY_REQUIRED`, and tenant/producer/source mismatch returns `TENANT_MISMATCH`.
- Tenant policy failures persist only to `invalid_raw_events` with credential/tenant audit fields and do not create accepted `raw_events` rows.
- Runtime tests now prove tenant A credentials cannot write tenant B events, missing/malformed tenant identity cannot become accepted, tenant-valid writes persist expected credential/merchant/store/producer identity, cross-tenant same-key valid writes remain separate, and mixed batches accept only tenant-valid items.
- Parser active stage remains `DD-P2-S4` until same-slice review accepts the execution evidence and activates `DD-P2-S5`.

## Latest DD-P2-S4 Review Evidence

- Review compared the accepted P2 auth/tenancy contract with route auth context flow, tenant policy validation in ingestion handlers, PostgreSQL/in-memory persistence contracts, and runtime negative tests.
- Review added malformed tenant identity proof: authenticated empty `identity.merchantId` returns `400`, persists invalid audit context, and does not create an accepted `raw_events` row.
- Review verdict: accepted with successor residuals for P2 authenticated smoke/runbook evidence in `DD-P2-S5`.
- Parser truth now activates `DD-P2-S5` for runtime smoke and runbook updates.

## Latest DD-P2-S5 Execution Evidence

- Updated `scripts/smoke-runtime.mjs` to require the P2 local/test credential JSON, send authorized event/batch probes, and prove missing and invalid bearer credentials return `401` without raw or invalid persistence.
- Smoke now proves tenant-scoped accepted writes persist credential/merchant/store/producer identity, duplicates remain idempotent, tenant mismatch persists only invalid audit context, invalid schema payloads keep credential audit context, and batch accepts a valid tenant-scoped item.
- Updated `docs/deployment/testable-runtime-deployment.md` with the placeholder-only P2 credential env var, Docker runtime env passing, host-side smoke env passing, expected unauthorized/tenant-mismatch probes, and residual production-secret/IAM boundaries.
- Updated `.env.example` with a placeholder-only P2 credential comment; no real token material was added.
- Same-slice review accepted this execution evidence and activated `DD-P2-CLOSEOUT-S1` for P2 closeout audit.

## Latest DD-P2-S5 Review Evidence

- Reviewed active docs/plan truth, the P2 auth/tenancy contract, `scripts/smoke-runtime.mjs`, `docs/deployment/testable-runtime-deployment.md`, `.env.example`, route auth/config surfaces, and tenant policy behavior against the S5 deliverables.
- Review found one smoke proof gap: HTTP smoke asserted unauthorized body/status but not the `WWW-Authenticate: Bearer` header from the P2 contract; fixed in `scripts/smoke-runtime.mjs` and reflected in the runbook smoke checklist.
- Replayed the Docker smoke path with placeholder-only local/test credentials: `npm run db:test:up`, `npm run test:db:migrations`, `npm run docker:build`, Docker runtime start, and `npm run smoke:runtime` passed.
- Replayed deterministic gates after the review fix: `node --check scripts/smoke-runtime.mjs`, `npm run test:runtime`, `npm run check:boundaries`, `npm run check:schema-migrations`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` passed.
- No real secret management, cloud infrastructure, P3 observability, P4 producer adapter, P5 worker, or P6 Agent runtime work was introduced.
- Review verdict: accepted with residuals for P2 closeout audit and P3/P4/P5/P6 successor work.

## Accepted Review Evidence for `DD-P2-CLOSEOUT-S1`

- Audited `DD-P2-S1` through `DD-P2-S5` across the P2 auth/tenancy contract, raw-event tenancy migration, PostgreSQL and in-memory raw-event storage, runtime bearer-token auth, tenant-safe ingestion policy, cross-tenant negative tests, authenticated Docker smoke, runbook, and placeholder env contract.
- Verified accepted P2 evidence covers missing/invalid credentials returning `401` / `UNAUTHORIZED` / `WWW-Authenticate: Bearer` without persistence; missing tenant identity returning `TENANT_IDENTITY_REQUIRED`; tenant mismatch returning `TENANT_MISMATCH` with invalid-event audit context only; tenant-scoped idempotency key reuse across tenants; and accepted writes persisting credential/merchant/store/producer identity.
- Replayed closeout validation: contract marker scan, deterministic Core boundary scan, `npm run db:test:up`, `npm run test:db:migrations`, `npm run test:app:repository`, `npm run test:runtime`, `npm run docker:build`, Docker runtime start, `npm run smoke:runtime`, `npm run check:boundaries`, `npm run check:schema-migrations`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` passed.
- Preserved residuals for P3 observability/redaction, P4 producer integration, P5 durable workers, P6 Agent runtime, full IAM/OAuth/SSO/admin UI, production secret management, and cloud deployment hardening.
- Recommended master tracker writeback after this terminal pack is persisted: mark `DD-PR-MASTER-P2` done and activate `DD-PR-MASTER-P3` for an observability foundation pack before real producer traffic expansion.
- Terminal writeback marked all P2 stages done and this pack `PACK_COMPLETE` only after accepted review evidence and validation passed.

## Machine Queue

- active_step: `PACK_COMPLETE`
- latest_completed_step: `PACK_COMPLETE`
- intended_handoff: `autopilot-closeout`
- latest_closeout_summary: Closed data-dyna-auth-tenancy-foundation at PACK_COMPLETE.
- latest_verification:
  - `plan_sync /home/peng/dt-git/github/data-dyna/docs/plan reports auth-tenancy STATUS done=6 pending=0 and WORKSET done=6 pending=0.`
  - `npm run check:plan passed: README plus 7 workset pack(s).`
  - `git diff --check passed.`
  - `workspace_scan confirms data-dyna@main is ahead 1 with 21 changed files; no additional closeout edits were required in this phase.`
  - `Accepted closeout review evidence covered db migrations, repository/runtime tests, Docker build/start, authenticated smoke, boundary/schema/type/test gates, and P2 residual handoff.`
  - `docs/plan/README.md`
  - `docs/plan/data-dyna-auth-tenancy-foundation_PLAN.md`
  - `docs/plan/data-dyna-auth-tenancy-foundation_STATUS.md`
  - `docs/plan/data-dyna-auth-tenancy-foundation_WORKSET.md`
  - `docs/security/auth-tenancy-foundation.md`
  - `migrations/0008_raw_event_tenancy.sql`
  - `src/app/auth/ingestion-auth.ts`
  - `scripts/smoke-runtime.mjs`
  - `docs/deployment/testable-runtime-deployment.md`
- terminal: `true`