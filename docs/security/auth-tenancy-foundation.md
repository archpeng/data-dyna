# Data Dyna Auth / Tenancy Foundation

Status: `DD-P2-S1` canonical contract. This document is the source of truth for the P2-lite auth/tenancy implementation before runtime auth code changes.

P2-lite protects `/events` and `/events/batch` before real producer traffic. It does not make Data Dyna production-IAM complete; it defines one request credential boundary, one tenant identity contract, tenant-safe raw-event persistence expectations, and the validation ladder for the remaining P2 slices.

## Scope

In scope for P2:

- authenticated ingestion requests for `POST /events` and `POST /events/batch`;
- tenant identity validation for accepted raw events;
- tenant-safe idempotency semantics;
- local/test placeholder credential configuration;
- negative tests proving missing credentials, invalid credentials, tenant mismatch, missing tenant identity, and cross-tenant idempotency collisions cannot create unsafe accepted events.

Out of scope for P2:

- full IAM, OAuth, SSO, self-service merchant permissions, or admin UI;
- external identity-provider calls or cloud secret-manager implementation;
- real producer integration and producer-specific mapping work;
- P3 observability/redaction, P4 producer adapters, P5 durable workers, or P6 Agent runtime authority.

## Credential boundary

`GET /healthz` remains unauthenticated. Every `POST /events` and `POST /events/batch` request must carry exactly one ingestion credential:

```http
Authorization: Bearer <opaque-ingestion-token>
```

P2 has one credential system only: opaque bearer tokens configured by the runtime. Do not add API-key aliases, query-string tokens, cookies, OAuth tokens, session tokens, or producer-specific auth systems in this pack.

Runtime credentials come from one local/test environment seam:

```bash
DATA_DYNA_INGESTION_CREDENTIALS_JSON='[
  {
    "credentialId": "local-pos-store-a",
    "token": "<local-placeholder-token-a>",
    "merchantId": "merchant-local-a",
    "storeIds": ["store-local-a"],
    "producer": {
      "service": "pos-lite-cashier",
      "environment": "test"
    },
    "source": "pos"
  }
]'
```

Rules for this env var:

1. It is required before event routes are served once P2 auth is implemented.
2. The value is a JSON array of credential records.
3. `credentialId`, `token`, `merchantId`, `storeIds`, `producer.service`, `producer.environment`, and `source` are required and non-empty.
4. `token` values are opaque secrets. Docs and `.env.example` may contain placeholders only; real tokens must not be committed.
5. Duplicate `credentialId` or duplicate `token` values are startup/config errors.
6. Empty or malformed credentials are startup/config errors, not request-time fallback behavior.
7. Production secret injection remains a deployment responsibility and is not implemented by P2.

## Tenant identity contract

The credential record is the authority for which tenant and producer scope may write. The event payload is the producer's assertion and must match the credential record before the event can be accepted.

For accepted `/events` traffic:

| Field | P2 decision |
|---|---|
| `identity.merchantId` | Required. Must equal the authenticated credential `merchantId`. This is the canonical tenant key for merchant ownership. |
| `identity.storeId` | Required. Must be included in authenticated credential `storeIds`. P2 accepted event traffic is store-scoped. |
| `identity.brandId` | Optional grouping/audit field only. It is not an auth or tenancy key in P2. |
| `producer.service` | Required by the event contract and must equal credential `producer.service`. |
| `producer.environment` | Required for accepted P2 ingestion even though the base event contract currently marks it optional. Must equal credential `producer.environment`. |
| `source` | Required by the event contract and must equal credential `source`. Use one credential record per source rather than source aliases. |
| `idempotency.scope` | For P2 external ingestion, accepted events must use `store`. `global`, `brand`, and `producer` scopes are reserved for a later contract review. |

The runtime must not silently stamp, rewrite, or infer `merchantId`, `storeId`, `producer.service`, `producer.environment`, or `source` into accepted event payloads. Accepted event JSON must already contain the matching values. This keeps producer bugs visible and prevents hidden cross-tenant writes.

## Request failure behavior

All failures return JSON and must not expose token values.

### Missing credential

Condition:

- no `Authorization` header;
- non-Bearer authorization scheme;
- empty bearer token.

Behavior:

- return `401`;
- include `WWW-Authenticate: Bearer`;
- response body uses `ok: false`, `status: 401`, and error code `UNAUTHORIZED`;
- do not call ingestion handlers;
- do not persist to `raw_events` or `invalid_raw_events`;
- do not enqueue analytics or worker side effects.

### Invalid credential

Condition:

- bearer token does not match any configured credential.

Behavior:

- return `401` with the same external shape as missing credentials;
- do not reveal whether a token was unknown, expired, malformed, or close to a valid token;
- do not call ingestion handlers;
- do not persist to `raw_events` or `invalid_raw_events`;
- do not enqueue analytics or worker side effects.

### Missing tenant identity

Condition after successful authentication:

- event payload parses as an event but lacks `identity.merchantId` or `identity.storeId`;
- event payload lacks `producer.environment`;
- event payload uses an idempotency scope that P2 does not accept.

Behavior:

- single-event request returns `400` with error code `TENANT_IDENTITY_REQUIRED`;
- batch request keeps the current `207` batch shape when the batch itself is valid, with a per-item `400` result;
- persist as an invalid raw event only after `DD-P2-S2` adds authenticated credential/tenant audit fields to `invalid_raw_events`;
- never create an accepted `raw_events` row;
- do not enqueue analytics or worker side effects for that item.

### Tenant mismatch

Condition after successful authentication:

- `identity.merchantId` differs from credential `merchantId`;
- `identity.storeId` is not in credential `storeIds`;
- `producer.service`, `producer.environment`, or `source` differs from the credential record.

Behavior:

- single-event request returns `403` with error code `TENANT_MISMATCH`;
- batch request keeps the current `207` batch shape when the batch itself is valid, with a per-item `403` result;
- persist as an invalid raw event only after `DD-P2-S2` adds authenticated credential/tenant audit fields to `invalid_raw_events`;
- never create an accepted `raw_events` row;
- do not enqueue analytics or worker side effects for that item.

### Idempotency collisions

Current storage has `raw_events.idempotency_key` globally unique. That is not tenant-safe for P2 because two tenants can legitimately reuse the same producer idempotency key.

P2 canonical idempotency identity is:

```text
merchantId + storeId + producer.service + producer.environment + source + idempotency.scope + idempotency.key
```

Required behavior:

1. Same canonical idempotency identity repeats return `202` with `duplicate: true` and the original persisted record.
2. Same `idempotency.key` from a different merchant, store, producer service, producer environment, or source is not a duplicate and must not return another tenant's record.
3. Cross-tenant key reuse must either insert a separate accepted row for the authenticated tenant or fail safely without exposing another tenant's data; the target P2 behavior is separate accepted rows once `DD-P2-S2` migrates the uniqueness constraint.
4. `event_id` remains an event identifier and must not be used as the only idempotency boundary. If an `event_id` collision occurs outside the same canonical idempotency identity, reject without mutating the existing row.

## Storage/audit contract for DD-P2-S2

`DD-P2-S2` owns schema and repository changes required by this contract. It must make accepted and invalid raw-event storage tenant-auditable before auth becomes the default runtime behavior.

Required accepted-event storage fields:

- `merchant_id` from `identity.merchantId`;
- `store_id` from `identity.storeId` and no longer nullable for accepted P2 event writes;
- `producer_service` from `producer.service`;
- `producer_environment` from `producer.environment`;
- `source` from event `source`;
- `credential_id` from the authenticated credential;
- `idempotency_scope` from `idempotency.scope`;
- `idempotency_key` from `idempotency.key`.

Required invalid-event audit fields before tenant/policy failures are persisted:

- `credential_id` when a credential was valid;
- credential `merchant_id` and attempted payload `identity.merchantId` when present;
- credential `store_id` scope and attempted payload `identity.storeId` when present;
- `producer_service`, `producer_environment`, `source`, and reason code when available;
- payload retained only as the existing invalid-event audit payload, never as an accepted fact source.

The uniqueness constraint for accepted idempotency must move from global `idempotency_key` uniqueness to the canonical P2 idempotency identity. Migration tests must prove that tenant A and tenant B can reuse the same idempotency key without either tenant receiving the other's record.

## Implementation map

`DD-P2-S1` changes only this document. Later P2 slices may change these surfaces:

### DD-P2-S2 tenant storage and idempotency safety

Allowed files/surfaces:

- `migrations/**` for a tenant/idempotency migration, expected as a new migration after `0007`;
- `src/ingestion/raw-event-store.ts` for tenant/audit record shape updates;
- `src/app/repositories/postgres-raw-event-repository.ts` for tenant/audit persistence and composite idempotency lookup;
- `tests/postgres-raw-event-repository.spec.ts` and migration tests.

Must not add ORM/DI frameworks or touch projection/snapshot/benchmark/evidence semantics beyond tenant-key compatibility.

### DD-P2-S3 runtime request auth boundary

Allowed files/surfaces:

- `src/app/auth/**` for parsing credentials, matching bearer tokens, and returning an authenticated ingestion context;
- `src/app/config/runtime-config.ts` for `DATA_DYNA_INGESTION_CREDENTIALS_JSON` parsing and fail-fast config validation;
- `src/app/http/events-route.ts` for rejecting unauthenticated event requests before ingestion;
- `src/app/runtime-server.ts` only if the server builder must pass auth config into routes;
- `.env.example` with placeholder-only values;
- runtime tests for missing, invalid, and accepted credentials.

Must not add OAuth/SSO/IAM frameworks or external identity-provider network calls.

### DD-P2-S4 tenant-safe event writes and negative tests

Allowed files/surfaces:

- `src/app/http/events-route.ts` for per-request authenticated context flow;
- `src/ingestion/event-handlers.ts` for tenant policy validation before accepted persistence;
- `src/ingestion/raw-event-store.ts` if store methods need authenticated context or tenant audit input;
- `src/app/repositories/postgres-raw-event-repository.ts` for tenant-safe accepted/invalid persistence integration;
- `tests/app-auth-tenancy-*.spec.ts`, `tests/app-runtime-s4.spec.ts`, and repository tests for cross-tenant negatives.

Must not implement producer adapters, durable queues, Agent runtime, or observability SDKs.

### DD-P2-S5 runtime smoke and runbook update

Allowed files/surfaces:

- `scripts/smoke-runtime.mjs` for authorized event probes and missing/invalid credential probes;
- `docs/deployment/testable-runtime-deployment.md` for P2 local/test auth runbook updates;
- `.env.example` for placeholder-only local/test credential examples.

Must not store real tokens or require cloud infrastructure.

## Validation ladder

`DD-P2-S1` docs-only validation:

```bash
npm run check:plan
git diff --check
```

`DD-P2-S2` storage validation:

```bash
npm run test:db:migrations
npm run test:app:repository
npm run check:schema-migrations
npm run check:boundaries
npm run typecheck
npm test
npm run check:plan
git diff --check
```

`DD-P2-S3` auth-boundary validation:

```bash
npm run test:runtime
npm run check:boundaries
npm run typecheck
npm test
npm run check:plan
git diff --check
```

`DD-P2-S4` tenant-safe write validation must add negative tests for:

- missing credential rejected;
- invalid credential rejected;
- merchant A credential cannot create accepted merchant B event;
- missing `merchantId`, missing `storeId`, or missing `producer.environment` cannot become accepted events;
- the same idempotency key can be reused across tenants without returning another tenant's record;
- a mixed batch cannot let tenant-invalid items create accepted raw events.

Run at least:

```bash
npm run test:runtime
npm run test:db:migrations
npm run test:app:repository
npm run check:boundaries
npm run check:schema-migrations
npm run typecheck
npm test
npm run check:plan
git diff --check
```

`DD-P2-S5` smoke/runbook validation:

```bash
npm run test:db:migrations
npm run docker:build
npm run smoke:runtime
npm run test:runtime
npm run check:boundaries
npm run check:schema-migrations
npm run typecheck
npm test
npm run check:plan
git diff --check
```

## Review and residuals

`DD-P2-S1` review should accept this contract only if it covers credential shape, tenant identity source, all required failure modes, implementation surfaces, residuals, and the docs-only validation evidence.

P2 closeout must not claim P3/P4/P5/P6 readiness. Residuals remain:

- P3: structured logs, metrics, traces, dashboards, alerts, and token/tenant redaction policy;
- P4: one real external producer path and producer-to-contract mapping;
- P5: durable worker queue, retries, checkpoints, and dead-letter handling;
- P6: controlled Agent runtime integration with no direct mutation authority;
- production deployment hardening and cloud secret management beyond the local/test env seam.
