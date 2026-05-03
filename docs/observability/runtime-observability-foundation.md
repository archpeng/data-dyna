# Data Dyna Runtime Observability Foundation

Status: `PACK_COMPLETE` local/test observability foundation. This document is the P3 source of truth for runtime observability before any vendor-specific trace, alert, or dashboard implementation changes.

P3 starts from the completed P2 auth/tenancy contract. Observability may use safe request, credential, tenant, producer, source, and correlation metadata to diagnose ingestion behavior. Observability must never expose bearer tokens, credential JSON, runtime secrets, raw event payloads, customer/member/device identifiers, idempotency keys, or merchant-sensitive payload details.

## Scope

In scope for P3:

1. A minimum structured log contract for HTTP/runtime and ingestion outcomes.
2. A minimum counter/metric contract for request health, latency, ingestion outcomes, auth failures, invalid events, and tenant-policy failures.
3. Correlation rules from HTTP request to event ingestion and raw-event persistence/audit evidence.
4. Vendor-neutral alert/query notes that can be proven locally or in tests.
5. Redaction and safe-field rules for P2 credential, tenant, producer, source, and event context.
6. A slice-by-slice validation ladder for the remaining P3 work.

Still out of scope for P3:

1. Vendor-specific observability backend setup, dashboard creation, or paging policy.
2. Mature SLO/incident-management process.
3. P4 external producer integration.
4. P5 durable worker queue implementation.
5. P6 Agent runtime/provider integration.
6. Production cloud secret management or deployment hardening.

## Observability principles

1. Prefer structured, machine-queryable fields over interpolated message strings.
2. Use bounded dimensions for metrics. Put high-cardinality investigation fields in logs/traces only when they are explicitly marked safe.
3. Record classified outcomes instead of payload details. Operators should see `UNAUTHORIZED`, `TENANT_IDENTITY_REQUIRED`, `TENANT_MISMATCH`, `invalid_schema`, `accepted`, or `duplicate`, not raw request bodies.
4. Treat redaction as an acceptance gate. A log/metric/trace that needs a token, secret, raw payload, customer identifier, or merchant-sensitive payload detail is out of contract.
5. Keep local/test proof independent of a vendor backend. A test log sink, in-memory counter sink, process output, or documented query shape is sufficient for P3 local validation.

## Local/test inspection runbook

This P3 runbook proves observability with placeholder credentials and in-memory sinks. It does not require production credentials, a cloud metrics backend, a dashboard service, or real producer traffic.

### 1. Run the targeted observability probe

From the repository root:

```bash
npm run probe:observability
```

The probe builds the Fastify runtime in-process with:

1. `DATA_DYNA_RUNTIME_ENV=test`.
2. One placeholder ingestion credential.
3. `InMemoryRuntimeLogSink` and `InMemoryRuntimeMetricSink`.
4. `InMemoryRawEventStore`, so no Docker or PostgreSQL is required.

It sends local/test requests for:

1. `GET /healthz`.
2. Missing bearer credential.
3. Invalid bearer credential.
4. Accepted authenticated event.
5. Duplicate authenticated event.
6. Authenticated invalid schema.
7. Authenticated tenant mismatch.

Expected output starts with `Runtime observability probe passed:` and prints a sanitized summary like:

```json
{
  "service": "data-dyna",
  "runtimeEnvironment": "test",
  "healthz": { "status": 200, "ok": true },
  "logEvents": {
    "ingestion.auth.rejected": 2,
    "runtime.request.completed": 6,
    "ingestion.event.accepted": 1,
    "ingestion.event.duplicate": 1,
    "ingestion.event.invalid": 1,
    "ingestion.event.tenant_policy_rejected": 1
  },
  "metricCounters": {
    "httpRequests": {
      "unauthorized": 2,
      "accepted": 1,
      "duplicate": 1,
      "invalid": 1,
      "tenantMismatch": 1
    },
    "authRejections": 2,
    "ingestionEvents": {
      "accepted": 1,
      "duplicate": 1,
      "invalid": 1,
      "tenantMismatch": 1
    },
    "tenantPolicyFailures": 1,
    "durationObservations": 6
  }
}
```

The printed summary intentionally omits tokens, credential ids, merchant/store ids, idempotency keys, event ids, raw payload values, and request run ids. The probe also fails if the underlying log or metric records contain bearer token values, idempotency keys, raw payload secrets, `Authorization`, `DATA_DYNA_INGESTION_CREDENTIALS_JSON`, or `storeIds`.

### 2. Run the regression probes

For full P3 local/test observability regression coverage:

```bash
npm run test:runtime
```

This includes the structured-log redaction proof, metric/counter redaction proof, the targeted observability probe above, and the existing runtime behavior tests. Use the narrower probes only when investigating a local failure:

```bash
npx tsx tests/app-observability-s2.spec.ts
npx tsx tests/app-observability-s3.spec.ts
npm run probe:observability
```

### 3. Use Docker smoke for HTTP/PostgreSQL behavior, not sink inspection

The Docker smoke gate in `docs/deployment/testable-runtime-deployment.md` remains the local/test proof for migrated PostgreSQL side effects and real HTTP request behavior. It does not expose the in-memory log or metric sinks from the running container. Use the targeted observability probe for P3 log/counter inspection, and use the Docker smoke path for P2/P3 behavior preservation across the HTTP and database boundary.

## Structured log contract

Every P3 runtime log record should be a JSON object or equivalent structured record with these baseline fields when available:

| Field | Meaning | Required for | Notes |
|---|---|---|---|
| `timestamp` | runtime emission time | all records | ISO timestamp or logger-native equivalent. |
| `level` | `info`, `warn`, or `error` | all records | Unauthorized and tenant-policy failures are classified, not token-specific. |
| `service` | `data-dyna` | all records | Stable service name. |
| `runtime_environment` | local/test/staging/prod-like runtime label | all records | Safe runtime config value only. |
| `event` | structured log event name | all records | Use names below. |
| `request_id` | server request identifier | HTTP records | Generated if absent; safe to log. |
| `correlation_id` | end-to-end correlation identifier | HTTP and ingestion records | Prefer incoming safe correlation header or event `correlation.correlationId`; otherwise use request id. |
| `route` | matched route such as `/events` | HTTP records | Bounded route template, not full URL with query params. |
| `method` | HTTP method | HTTP records | Bounded value. |
| `status` | response status code | completed HTTP records | Numeric code. |
| `duration_ms` | request or handler duration | completed HTTP records | Numeric duration. |
| `outcome` | accepted/duplicate/invalid/unauthorized/tenant_mismatch/error | ingestion records | Bounded outcome enum. |
| `error_code` | public or internal error code | failures | Examples: `UNAUTHORIZED`, `TENANT_IDENTITY_REQUIRED`, `TENANT_MISMATCH`, `invalid_schema`. |
| `credential_id` | authenticated credential id | authorized ingestion records | Safe audit id; never log token or credential JSON. |
| `merchant_id` | event or credential merchant id | authorized ingestion logs/traces | Safe internal tenant key for diagnosis; do not use as default metric label. |
| `store_id` | event or resolved store id | authorized ingestion logs/traces | Safe internal tenant key for diagnosis; do not log full `storeIds` arrays. |
| `source` | Data Dyna event source | authorized ingestion and event records | Bounded contract enum. |
| `producer_service` | credential/event producer service | authorized ingestion and event records | Bounded by credential/event contract. |
| `producer_environment` | credential/event producer environment | authorized ingestion and event records | Bounded environment label. |
| `event_domain` | Data Dyna event domain | accepted or parsed-invalid event records | Safe enum. |
| `event_name` | Data Dyna event name | accepted or parsed-invalid event records | Safe enum. |
| `batch_size` | number of batch items | batch records | Count only; no item payloads. |

Minimum log event names:

| Log event | Level | When emitted | Required safe fields |
|---|---|---|---|
| `runtime.request.completed` | `info` for non-5xx, `error` for 5xx | After every HTTP request | `request_id`, `correlation_id`, `route`, `method`, `status`, `duration_ms`. |
| `ingestion.auth.rejected` | `warn` | Missing, malformed, non-Bearer, empty, or invalid bearer credential | `request_id`, `route`, `method`, `status`, `error_code: UNAUTHORIZED`; no token-derived fields. |
| `ingestion.event.accepted` | `info` | A single event or batch item is accepted | `credential_id`, `merchant_id`, `store_id`, `source`, `producer_service`, `producer_environment`, `event_domain`, `event_name`, `outcome: accepted`. |
| `ingestion.event.duplicate` | `info` | A same canonical tenant idempotency identity repeats | Same safe fields as accepted plus `outcome: duplicate`; never log `idempotency.key`. |
| `ingestion.event.invalid` | `warn` | Payload fails event schema validation | `request_id`, `route`, `method`, `status`, `error_code: invalid_schema`; no raw payload. Include safe credential context only if authenticated. |
| `ingestion.event.tenant_policy_rejected` | `warn` | Parsed event fails P2 tenant policy | `credential_id`, `merchant_id`, `store_id`, `source`, `producer_service`, `producer_environment`, `error_code`, `outcome`; no raw payload. |
| `ingestion.batch.completed` | `info` or `warn` | Batch request completes | `request_id`, `batch_size`, aggregate result counts, status; no item payloads. |

Structured log records must not include:

1. `Authorization` header or bearer token values.
2. `DATA_DYNA_INGESTION_CREDENTIALS_JSON` or any credential JSON.
3. `token`, `secret`, password, database URL, or cloud credential values.
4. Full `request.body`, raw `payload`, raw `event`, raw `properties`, or `invalid.payload`.
5. `idempotency.key`.
6. `identity.memberId`, `identity.customerId`, `identity.deviceId`, `correlation.sessionId`, or raw entity ids by default.
7. Cart/order/payment/refund/menu/customer details from `properties`.
8. Full URL query strings or arbitrary request headers.

## Counter and metric contract

P3 counters may be implemented with an in-process test sink, a text endpoint, process logs, or a future metrics backend. The contract is backend-neutral.

Minimum metric names and dimensions:

| Metric | Type | Meaning | Allowed labels |
|---|---|---|---|
| `data_dyna_http_requests_total` | counter | Number of completed HTTP requests | `route`, `method`, `status_class`, `outcome`. |
| `data_dyna_http_request_duration_ms` | histogram or summary | HTTP request duration | `route`, `method`, `status_class`. |
| `data_dyna_ingestion_events_total` | counter | Event-level ingestion outcomes | `route`, `source`, `producer_service`, `producer_environment`, `event_domain`, `event_name`, `outcome`, `error_code`. |
| `data_dyna_ingestion_batch_items_total` | counter | Batch item outcomes | `source`, `producer_service`, `producer_environment`, `outcome`, `error_code`. |
| `data_dyna_ingestion_auth_rejections_total` | counter | Missing or invalid ingestion credentials | `route`, `method`, `error_code`. |
| `data_dyna_ingestion_tenant_policy_failures_total` | counter | Tenant identity or tenant mismatch rejects | `source`, `producer_service`, `producer_environment`, `error_code`. |
| `data_dyna_runtime_errors_total` | counter | Unhandled runtime errors classified at route boundary | `route`, `method`, `error_code`. |

Metric label rules:

1. Allowed labels must be bounded enums or low-cardinality runtime fields.
2. Do not use `merchant_id`, `store_id`, `credential_id`, `brand_id`, `event_id`, `idempotency_key`, `entity_id`, `member_id`, `customer_id`, `device_id`, `session_id`, raw URL, raw IP, or payload-derived values as default metric labels.
3. Tenant impact analysis should use structured logs or traces with safe tenant fields, not high-cardinality metric labels.
4. `status_class` should be `2xx`, `4xx`, or `5xx`, not a free-form status string.
5. `outcome` should be one of a bounded set: `accepted`, `duplicate`, `invalid`, `unauthorized`, `tenant_identity_required`, `tenant_mismatch`, `error`.
6. `error_code` should be a bounded code such as `UNAUTHORIZED`, `TENANT_IDENTITY_REQUIRED`, `TENANT_MISMATCH`, `invalid_schema`, or `unexpected_error`.

## Correlation contract

P3 correlation connects a request to its ingestion outcomes without logging sensitive payloads.

Minimum rules:

1. Every HTTP request has a `request_id`. Use an incoming safe `x-request-id` only after basic length/character validation; otherwise generate one.
2. Every request has a `correlation_id`. Prefer a safe incoming `x-correlation-id`; for event requests, an event-level `correlation.correlationId` may be linked after schema parsing. If no safe value exists, use `request_id`.
3. Accepted event records may log or trace `event_id` as an investigation field, but `event_id` must not be a default metric label.
4. Idempotency keys are persistence semantics, not observability correlation identifiers. Do not log, trace, or label `idempotency.key`.
5. Batch logs should record one request-level `correlation_id` and aggregate counts. Per-item logs may include safe event/correlation fields only after schema parsing and redaction checks.
6. Tenant-policy failures may include safe credential context and parsed event tenant/source fields needed to diagnose mismatch, but they must not include the raw event body.
7. Invalid schema failures should not mine unvalidated payloads for tenant or entity details. Use only authenticated credential context and classification fields.

Future P5/P6 extension points:

1. Worker jobs should carry `request_id`, `correlation_id`, tenant scope, source, and safe producer fields once durable workers exist.
2. Agent runs should carry `correlation_id`, `agent_run_id`, and reviewed evidence ids once P6 exists, but Agent prompts, provider payloads, and merchant-sensitive recommendations remain separately redacted.

## Safe field map from P2 to observability

| P2/runtime source | Example field | Logs | Metrics | Traces | Rule |
|---|---|---|---|---|---|
| Authorization header | `Authorization: Bearer ...` | never | never | never | Only classify as `UNAUTHORIZED`; do not record scheme/token details beyond public error code. |
| Credential env JSON | `DATA_DYNA_INGESTION_CREDENTIALS_JSON` | never | never | never | Runtime secret/config surface; never emit. |
| Credential token | `token` | never | never | never | Secret. |
| Credential id | `credentialId` | allowed after auth | not default label | allowed after auth | Safe audit id, but avoid metric cardinality. |
| Credential merchant | `merchantId` | allowed after auth | not default label | allowed after auth | Safe tenant key for investigation. |
| Credential store scope | `storeIds` | no full array | never | no full array | Log resolved `store_id` or a count, not the credential scope list. |
| Event merchant | `identity.merchantId` | allowed after schema parse | not default label | allowed after schema parse | Safe tenant key; do not infer from invalid raw payload. |
| Event store | `identity.storeId` | allowed after schema parse | not default label | allowed after schema parse | Safe tenant key; do not infer from invalid raw payload. |
| Event brand | `identity.brandId` | allowed if needed | not default label | allowed if needed | Optional grouping/audit only, not an auth key. |
| Event member/customer/device | `identity.memberId`, `identity.customerId`, `identity.deviceId` | never by default | never | never by default | Customer/device identifiers are PII-like and out of P3 minimum observability. |
| Producer service | `producer.service` | allowed | allowed | allowed | Safe bounded producer dimension. |
| Producer environment | `producer.environment` | allowed | allowed | allowed | Safe bounded environment dimension. |
| Source | `source` | allowed | allowed | allowed | Safe bounded source enum. |
| Event domain/name | `domain`, `name` | allowed after schema parse | allowed | allowed | Safe bounded event contract enums. |
| Event id | `correlation.eventId` | investigation field only | never | investigation field only | Useful for debugging accepted records; too high-cardinality for labels. |
| Request id | generated or `x-request-id` | allowed | never | allowed | Safe after validation; primary request investigation key. |
| Correlation id | generated or safe incoming/event value | allowed | never | allowed | Safe after validation; primary cross-step investigation key. |
| Session id | `correlation.sessionId` | never by default | never | never by default | User/session tracking can be sensitive and high-cardinality. |
| Idempotency key | `idempotency.key` | never | never | never | Persistence key can expose producer/customer/business detail. |
| Idempotency scope | `idempotency.scope` | allowed | allowed | allowed | Bounded enum. |
| Entity type | `entity.type` | allowed | allowed | allowed | Bounded enum. |
| Entity id | `entity.id` | never by default | never | never by default | High-cardinality and may be customer/order/payment sensitive. |
| Event properties | `properties` | never | never | never | Raw payload and merchant/customer detail surface. |
| Invalid audit payload | `invalid_raw_events.payload` | never | never | never | Storage audit payload is not an observability output. |
| Error code | public error code | allowed | allowed | allowed | Use bounded public/internal code, not stack or payload detail. |

## Alert and query notes

P3 does not create production dashboards, paging rules, mature SLOs, or a vendor backend. The following notes define the minimum questions that must be answerable through local/test logs, counters, probes, smoke commands, or clearly marked residuals.

### Local/test query map

| Risk / question | Local/test query signal | Probe or command | P3 status |
|---|---|---|---|
| Health | `GET /healthz` returns 200 with `ok: true` | `npm run probe:observability`; Docker smoke runbook | Implemented local/test proof. |
| 5xx spike / unexpected route error | `data_dyna_http_requests_total{status_class="5xx",outcome="error"}` and `data_dyna_runtime_errors_total{error_code="unexpected_error"}` increase; `runtime.request.completed` has `status >= 500` | `npx tsx tests/app-observability-s3.spec.ts` includes the runtime-error counter proof | Implemented local/test proof; production paging thresholds residual. |
| Invalid event spike | `data_dyna_ingestion_events_total{outcome="invalid",error_code="invalid_schema"}` increases; `ingestion.event.invalid` appears | `npm run probe:observability`; `npm run test:runtime` | Implemented local/test proof. |
| Unauthorized spike | `data_dyna_ingestion_auth_rejections_total{error_code="UNAUTHORIZED"}` increases; `ingestion.auth.rejected` appears without token values | `npm run probe:observability`; `npm run test:runtime` | Implemented local/test proof. |
| Tenant mismatch spike | `data_dyna_ingestion_tenant_policy_failures_total{error_code="TENANT_MISMATCH"}` increases; `ingestion.event.tenant_policy_rejected` appears without raw payload values | `npm run probe:observability`; `npm run test:runtime` | Implemented local/test proof. |
| Latency regression | `data_dyna_http_request_duration_ms` observations exist by route/method/status class; future backend computes p95/p99 | `npm run probe:observability`; `npm run test:runtime` | Local duration observations implemented; mature SLO thresholds residual. |
| DB migration failure | `npm run test:db:migrations` fails or CI DB migration gate fails before runtime traffic | `npm run test:db:migrations`; CI `db-migration-gate` | Local/CI command proof only; no production alert backend in P3. |
| P5 worker lag/dead letters | Future worker metrics/logs for lag, retry count, checkpoint age, and dead letters | Not runnable until P5 durable workers exist | Explicit residual. |
| P6 Agent/provider failures | Future Agent metrics/logs for run failure rate, provider audit failures, and validator/merchant-review outcomes | Not runnable until P6 Agent runtime exists | Explicit residual. |

The local query map uses only placeholder credentials and bounded dimensions. It must not be converted into a production dashboard claim until a future observability backend is selected and reviewed.

The detailed notes below preserve the minimum signal semantics for future backend-specific query translation.

### Health and runtime errors

Question: is the runtime serving traffic and returning unexpected 5xx responses?

Signals:

1. `/healthz` returns 200.
2. `data_dyna_http_requests_total{status_class="5xx"}` increases.
3. `runtime.request.completed` records with `status >= 500` or `outcome: error` appear.

Local/test proof: runtime test or smoke can trigger a known request and inspect structured records/counters without external backend.

### Auth rejection spike

Question: are producers missing or sending invalid credentials?

Signals:

1. `data_dyna_ingestion_auth_rejections_total` increases by route/method.
2. `ingestion.auth.rejected` logs include `error_code: UNAUTHORIZED` and no token value.

Local/test proof: existing missing/invalid bearer probes should create classified observability output after P3-S2/S3.

### Invalid event spike

Question: are producers sending payloads outside the event contract?

Signals:

1. `data_dyna_ingestion_events_total{outcome="invalid"}` increases.
2. `ingestion.event.invalid` logs include `invalid_schema` and safe credential/source context only when authenticated.

Local/test proof: invalid payload runtime tests should prove classification and redaction without logging payload body.

### Tenant policy failure spike

Question: are producers sending events outside their credential tenant/source scope?

Signals:

1. `data_dyna_ingestion_tenant_policy_failures_total` increases with `TENANT_IDENTITY_REQUIRED` or `TENANT_MISMATCH`.
2. `ingestion.event.tenant_policy_rejected` logs include safe credential tenant/source fields and no raw event body.

Local/test proof: P2 tenant mismatch and missing identity tests should prove classified observability output after P3-S2/S3.

### Latency regression

Question: are event routes becoming slow?

Signals:

1. `data_dyna_http_request_duration_ms` p95/p99 or equivalent local histogram increases for `/events` or `/events/batch`.
2. `runtime.request.completed` records include `duration_ms` for slow requests.

Local/test proof: target tests can assert duration fields exist; mature SLO thresholds remain residual.

### DB migration failure

Question: did schema setup fail before runtime traffic?

Signals:

1. `npm run test:db:migrations` or CI DB migration gate fails.
2. Deployment/runbook logs contain the migration command exit status.

Local/test proof: P3 does not implement a deployment platform alert; the runbook/query note is the minimum local contract.

### Worker and Agent residual alerts

P5 workers do not exist as durable runtime jobs yet, and P6 Agent runtime is not active. P3 may reserve alert/query names for future worker lag, dead letters, Agent failure rate, and provider audit failures, but must not claim those alerts are implemented before P5/P6 evidence exists.

## Redaction checklist

Before any P3-S2 or P3-S3 instrumentation is accepted, tests or probes must show that observability output does not contain:

1. Bearer token values, `Authorization` header values, or near-token substrings.
2. `DATA_DYNA_INGESTION_CREDENTIALS_JSON` values or credential JSON.
3. Database URLs, passwords, cloud credentials, or runtime secret env values.
4. Raw request body, raw event JSON, raw invalid payload, or raw event `properties`.
5. Idempotency keys.
6. Customer/member/device/session identifiers by default.
7. Entity ids for order, payment, refund, member, cart, or menu item by default.
8. Merchant-sensitive cart, order, payment, refund, menu, staff, preference, or recommendation details from payload fields.
9. Stack traces in normal classified 4xx paths. Unexpected 5xx traces may be available in developer logs only after secret/payload redaction.

## Remaining P3 implementation ladder

### `DD-P3-S2` — structured runtime logging and correlation

Allowed primary surfaces:

1. `src/app/observability/**` or a smaller app-layer logging seam.
2. `src/app/app.ts` and `src/app/http/events-route.ts` for request/correlation logging.
3. `tests/app-runtime-s4.spec.ts` or new runtime observability tests.

Acceptance focus:

1. Authorized success, duplicate, invalid schema, missing/invalid bearer, and tenant mismatch paths emit structured records with safe fields.
2. Logs include request/correlation ids and classified outcomes.
3. Tests prove token, credential JSON, raw payload, and idempotency-key redaction.

Validation:

```bash
npm run test:runtime
npm run check:boundaries
npm run typecheck
npm test
npm run check:plan
git diff --check
```

### `DD-P3-S3` — ingestion metrics and runtime counters

Allowed primary surfaces:

1. `src/app/observability/**` or a small runtime counter module.
2. Runtime route seams needed to increment counters.
3. Runtime tests for the metric labels and counts in this contract.

Acceptance focus:

1. Counters cover success, duplicate, invalid schema, unauthorized, tenant identity required, tenant mismatch, route errors, and latency.
2. Metrics use bounded labels only.
3. Tests prove forbidden high-cardinality/sensitive labels are absent.

Validation:

```bash
npm run test:runtime
npm run check:boundaries
npm run typecheck
npm test
npm run check:plan
git diff --check
```

### `DD-P3-S4` — runbook, alert/query notes, and smoke coverage

Allowed primary surfaces:

1. This document for final local/test query/runbook notes.
2. `docs/deployment/testable-runtime-deployment.md` for P3 smoke/runbook additions.
3. `scripts/smoke-runtime.mjs` only if smoke must inspect observable output.

Acceptance focus:

1. A fresh developer can produce and inspect P3 logs/counters locally with placeholder credentials.
2. Query notes cover health, 5xx, invalid event spike, unauthorized spike, tenant mismatch spike, latency, DB migration failure, and worker/Agent residuals.
3. `npm run probe:observability` proves the documented in-memory log/counter inspection path; Docker smoke remains the HTTP/PostgreSQL proof and is not required for sink inspection unless the smoke path changes.

Validation:

```bash
npm run probe:observability
npm run test:runtime
npm run smoke:runtime  # only if smoke changes or runbook requires fresh Docker proof
npm run check:boundaries
npm run typecheck
npm test
npm run check:plan
git diff --check
```

### `DD-P3-CLOSEOUT-S1` — closeout audit

Acceptance focus:

1. Audit this contract, redaction tests, structured logs, counters, runbook/query notes, and validation evidence.
2. Terminalize the P3 pack only after all non-deferred P3 slices have accepted review evidence.
3. Preserve residuals for cloud observability backend selection, mature SLO/incident process, P4 producer integration, P5 durable workers, and P6 Agent runtime.

Validation:

```bash
npm run test:runtime
npm run smoke:runtime  # if smoke was updated
npm run check:boundaries
npm run typecheck
npm test
npm run check:plan
git diff --check
```

## Explicit residuals

After DD-P3-CLOSEOUT-S1 acceptance, this P3 foundation still leaves the following work outside the current evidence:

1. Production-readiness master tracker writeback and P4 successor-pack creation after this terminal P3 pack is persisted.
2. P4 real POS, miniapp, mobile-hq, or backend producer integration.
3. P5 durable worker queue, retries, checkpoints, dead letters, and idempotent background processing.
4. P6 full Agent runtime, real Pi provider integration, provider audit, and production Agent governance.
5. Full production observability backend selection, dashboards, paging, mature SLOs, incident management, and capacity planning.
6. Cloud production secret management and deployment hardening.

## Historical DD-P3-S1 validation

DD-P3-S1 was docs-first and did not implement runtime instrumentation. Minimum validation was:

```bash
npm run check:plan
git diff --check
```

Escalate to runtime validation only if this slice unexpectedly changes runtime code. Runtime instrumentation must wait until this redaction contract is explicit and accepted in review.
