# External Producer Contract

Status: P4 POS producer-boundary and local/test runbook source of truth through `DD-P4-S4`. `DD-P4-S1` defined the contract, `DD-P4-S2` added the mapper proof, `DD-P4-S3` added the `/events` delivery proof, and `DD-P4-S4` documents operation, observability, replay, and residual handoff.

## Scope

P4 proves one smallest producer path before broader integration work:

- Pilot producer: POS cashier / transaction-scene producer.
- Pilot event: `pos.order_paid`.
- Data Dyna target: authenticated `POST /events` with a `DataDynaEvent` payload.
- Runtime boundary: existing P2 bearer-token auth, tenant policy, store-scoped idempotency, and P3 local/test logs and metrics.

This pack still proves only the Data Dyna-side local/test path. It does not claim external POS repository hookup, production dashboarding, durable worker replay, or Agent runtime completion.

## Source truth

- `docs/roadmap/data-dyna-production-readiness-roadmap.md` P4 requires producer contract, mapping, delivery semantics, retry/backfill, non-blocking producer failure policy, and one pilot path first.
- `docs/security/auth-tenancy-foundation.md` defines the only ingestion credential boundary and tenant-safe accepted write policy.
- `docs/observability/runtime-observability-foundation.md` defines the safe log/metric fields and redaction rules for ingestion paths.
- `src/contracts/event-contract.ts` already supports `source: pos`, `domain: transaction_scene`, and `name: pos.order_paid`.
- `src/ingestion/event-handlers.ts` and `src/ingestion/raw-event-store.ts` enforce schema parsing, tenant policy, invalid persistence, accepted persistence, and canonical tenant idempotency identity.
- `src/app/http/events-route.ts` enforces bearer auth before ingestion handlers and emits P3 logs/metrics.

## Producer boundary

| Producer area | P4 pilot responsibility | Explicit non-responsibility |
|---|---|---|
| POS cashier/payment flow | Emit one sanitized `pos.order_paid` fact after the POS primary payment commit succeeds. | Do not make Data Dyna send part of the payment authorization/capture decision. |
| Data Dyna ingestion client | Send one `DataDynaEvent` JSON payload to authenticated `POST /events`. | Do not bypass `/events`, runtime auth, tenant policy, or idempotency persistence. |
| Tenant/source assertion | Include `identity.merchantId`, `identity.storeId`, `producer.service`, `producer.environment`, and `source` in the payload; these must match the credential. | Do not let Data Dyna stamp, infer, rewrite, or repair tenant/source identity. |
| Idempotency | Use `idempotency.scope = store` and a deterministic producer-side key for the same paid order/payment fact. | Do not use `global`, `brand`, or `producer` scope for accepted P2/P4 external ingestion. |
| Observability | Rely on existing P3 route and ingestion logs/metrics for accepted, duplicate, invalid, unauthorized, and tenant-policy rejected paths. | Do not log bearer tokens, credential JSON, idempotency keys, raw payloads, customer/member/device identifiers, entity IDs as metric labels, or merchant-sensitive payload details. |
| Retry/backfill | Classify send outcomes and preserve replay input from POS source facts; replays must emit the same idempotency key. | Do not implement P5 durable Data Dyna worker queues, checkpoints, or dead letters in P4. |

## P2 auth and tenancy application

The POS producer path uses the existing credential system only:

```http
Authorization: Bearer <opaque-ingestion-token>
```

The token value is never documented, committed, logged, emitted as a metric label, or included in fixtures. Local/test docs may use placeholders such as `<local-placeholder-token-a>` only.

The credential record must be scoped like this for the POS pilot:

```json
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
```

Accepted `pos.order_paid` events must already contain matching values:

1. `identity.merchantId = credential.merchantId`.
2. `identity.storeId` is one of `credential.storeIds`.
3. `producer.service = credential.producer.service`.
4. `producer.environment = credential.producer.environment`.
5. `source = credential.source`.
6. `idempotency.scope = store`.

If any of those values are missing or mismatched, P2 behavior applies: missing tenant identity returns `TENANT_IDENTITY_REQUIRED`, tenant/source/producer mismatch returns `TENANT_MISMATCH`, and accepted `raw_events` rows are not created for those items.

## Delivery semantics

The P4 pilot delivery contract is intentionally small:

1. Send after POS primary payment commit, not before or during the primary payment decision.
2. Use `POST /events` for the first pilot. `/events/batch` remains available but is not required for the first proof.
3. Use JSON `DataDynaEvent` payloads that parse under `DataDynaEventSchema`.
4. Use a short bounded producer-side HTTP timeout. The P4 local/test target is `1500 ms`; `DD-P4-S3` may encode the value as a small constant or local/test option, but it must remain bounded and non-blocking.
5. Treat `202` accepted and `202` duplicate as successful producer-send outcomes.
6. Treat `400`, `401`, and `403` as classified contract/config defects, not hot-loop retry signals.
7. Treat timeout, network failure, and `5xx` as transient send failures that may be retried asynchronously or backfilled from POS source facts.

## Non-blocking producer failure policy

Data Dyna send failure must not block POS payment, refund, cancellation, or cashier primary flows.

For the pilot, the POS primary flow is considered successful or failed based only on the POS/payment system's own source-of-truth result. Data Dyna delivery is a post-commit side effect. The producer may return local evidence such as `sent`, `duplicate`, `invalid_payload`, `unauthorized`, `tenant_mismatch`, `timeout`, or `unavailable`, but that evidence must not change the already-committed payment/refund/cancel outcome.

If the Data Dyna send fails:

1. The POS primary response remains controlled by the POS/payment result.
2. The producer records a classified non-blocking send outcome in its own operational context if that surface exists.
3. Replay/backfill uses the POS order/payment source facts and the same deterministic idempotency key.
4. Data Dyna must not ask POS to re-authorize, re-capture, refund, or cancel because of ingestion failure.

## Retry and backfill policy

| Outcome | Producer classification | Retry/backfill behavior |
|---|---|---|
| `202` accepted | `sent` | No retry required. |
| `202` duplicate | `duplicate` | No retry required; this is the expected replay result for the same tenant idempotency identity. |
| `400` invalid schema | `invalid_payload` | Do not retry blindly. Fix mapper/fixture contract, then replay with the same idempotency key if the source fact is still valid. |
| `400` `TENANT_IDENTITY_REQUIRED` | `tenant_identity_required` | Do not retry blindly. Fix credential/mapping tenant fields first. |
| `401` `UNAUTHORIZED` | `unauthorized` | Do not hot-loop. Fix placeholder/runtime credential configuration first. |
| `403` `TENANT_MISMATCH` | `tenant_mismatch` | Do not retry blindly. Fix credential/mapping tenant/source/producer mismatch first. |
| Timeout, network error, or `5xx` | `transient_send_failure` | May retry asynchronously with bounded backoff. If no durable producer retry surface is available, preserve as an external hookup residual and backfill later from POS source facts. |

Backfill/replay must be deterministic:

- Use the same `merchantId`, `storeId`, `producer.service`, `producer.environment`, `source`, `idempotency.scope`, and `idempotency.key` for the same paid order/payment fact.
- Re-emitting the same fact must produce a Data Dyna duplicate, not a second business event.
- Historical replays must not introduce payment PANs, bearer tokens, raw customer PII, raw customer identifiers, or merchant-sensitive item/payment details.

## Local/test POS producer runbook

The runnable P4 proof is local/test only and uses placeholder ingestion credentials. It does not require production tokens, a real external POS repository, a network call by default, a durable queue, or an observability backend.

Run the POS producer delivery probe from the repository root:

```bash
npm run probe:pos-producer
```

The probe builds an in-memory Fastify app with `InMemoryRawEventStore`, `InMemoryRuntimeLogSink`, `InMemoryRuntimeMetricSink`, and a placeholder `DATA_DYNA_INGESTION_CREDENTIALS_JSON` value. It sends the sanitized POS order-paid fixture through the same delivery adapter used by the runtime tests. The injected transport calls authenticated `POST /events`; it does not make a real external network call.

Expected safe output shape:

```json
{
  "deliveryResults": {
    "sent": 1,
    "duplicate": 1,
    "unauthorized": 1,
    "invalid_payload": 1,
    "tenant_mismatch": 1,
    "transient_send_failure": 1
  },
  "rawEventEvidence": {
    "acceptedRows": 1,
    "acceptedByType": { "pos/transaction_scene/pos.order_paid": 1 },
    "invalidRows": 2,
    "invalidReasonCodes": { "invalid_schema": 1, "TENANT_MISMATCH": 1 },
    "unauthorizedPersistenceSideEffects": 0
  },
  "replayBackfillHandoff": {
    "duplicateReplayRowsCreated": 0,
    "retryOrBackfillDeliveryFailures": 1,
    "p5DurableWorkerImplementationClaimed": false
  }
}
```

Use that summary as the local/test inspection surface for `raw_events` and `invalid_raw_events` side effects: accepted POS delivery persists exactly one accepted raw event, duplicate replay creates no second accepted row, invalid payload and tenant mismatch persist invalid audit evidence only, and unauthorized delivery creates no accepted or invalid persistence side effects.

For a PostgreSQL-backed smoke run, use the Docker/local runtime path in `docs/deployment/testable-runtime-deployment.md`; inspect counts only, not raw payloads, tokens, event ids, idempotency keys, or payment/customer details. Safe query shapes are:

```sql
SELECT source, domain, name, producer_service, producer_environment, count(*)
  FROM raw_events
 WHERE source = 'pos'
 GROUP BY source, domain, name, producer_service, producer_environment;

SELECT source, producer_service, producer_environment, reason_code, count(*)
  FROM invalid_raw_events
 WHERE source = 'pos'
 GROUP BY source, producer_service, producer_environment, reason_code;
```

Do not select or paste `event`, `payload`, `idempotency_key`, bearer tokens, payment identifiers, customer identifiers, or merchant-sensitive details into runbook evidence.

## Replay and backfill notes

Replay/backfill is a producer-side operational obligation in P4 and a durable-worker implementation obligation in P5. P4 documents the rules and proves classification; it does not implement a queue, checkpoint table, dead-letter store, or production scheduler.

| Producer result | Operator action | Blocking policy |
|---|---|---|
| `sent` | No replay. The fact was accepted once. | Never block POS primary flow. |
| `duplicate` | No replay. This is expected when the same POS fact is replayed with the same tenant idempotency identity. | Never block POS primary flow. |
| `invalid_payload` | Fix the mapper/fixture contract first, then replay from the POS source fact with the same deterministic idempotency key if still valid. | Do not hot-loop; do not fail or reverse POS payment/refund/cancel. |
| `tenant_identity_required` | Fix missing merchant/store/idempotency-scope fields before replay. | Do not infer tenant identity inside Data Dyna. |
| `unauthorized` | Fix placeholder/runtime credential configuration before replay. | Do not hot-loop and do not expose token values in logs or tickets. |
| `tenant_mismatch` | Fix credential/source/producer/tenant mapping before replay. | Do not rewrite payload identity in Data Dyna. |
| `transient_send_failure` | Retry asynchronously with bounded backoff where the producer has such a surface; otherwise preserve the source fact for later P5 backfill. | Never block the already committed POS primary flow. |

Backfill input must be the sanitized POS source fact plus the same `merchantId`, `storeId`, `producer.service`, `producer.environment`, `source`, `idempotency.scope`, and deterministic `idempotency.key`. A replay that reaches Data Dyna after an earlier success must return duplicate evidence rather than creating a second business event.

## P3 observability application

The Data Dyna runtime already emits P3 logs and metrics for the `/events` path. The POS pilot must use those signals rather than a parallel observability path.

Expected Data Dyna-side signals:

| Producer outcome | P3 log/metric signal |
|---|---|
| Accepted event | `ingestion.event.accepted`, `runtime.request.completed`, `data_dyna_ingestion_events_total{source="pos", producer_service="pos-lite-cashier", producer_environment="test", event_domain="transaction_scene", event_name="pos.order_paid", outcome="accepted"}`. |
| Duplicate replay | `ingestion.event.duplicate` and ingestion metric outcome `duplicate`. |
| Invalid payload | `ingestion.event.invalid` and ingestion metric outcome `invalid`, without raw payload fields. |
| Missing/invalid bearer | `ingestion.auth.rejected`, `data_dyna_ingestion_auth_rejections_total`, and no accepted or invalid persistence side effects. |
| Missing tenant identity or tenant mismatch | `ingestion.event.tenant_policy_rejected`, `data_dyna_ingestion_tenant_policy_failures_total`, and invalid audit only. |
| Transport timeout or network failure before Data Dyna receives the request | No Data Dyna P3 route log/metric is expected; diagnose from the producer delivery result `transient_send_failure` and preserve retry/backfill input. |
| Data Dyna `5xx` after the request reaches `/events` | `runtime.request.completed` with `outcome="error"`, `data_dyna_http_requests_total{status_class="5xx"}`, and `data_dyna_runtime_errors_total`; classify as `transient_send_failure`. |

P3 still forbids token values, credential JSON, idempotency keys, raw event payloads, customer/member/device identifiers, raw entity IDs as metric labels, and merchant-sensitive payload details in logs/metrics/traces.

## Residual producers and successor scope

P4 starts with only POS `pos.order_paid`. These remain residual until later accepted slices or packs:

1. Additional POS events: `pos.order_opened`, `pos.refund_recorded`, cancellation, employee-operation detail, and broader cashier context.
2. Mini-program producers: menu views, cart changes, checkout starts, coupons, recommendations, and channel behavior.
3. Mobile-HQ producers: merchant review, accept/reject/apply/revert actions, and preference confirmation.
4. Backend fact sync producers: orders, payments, refunds, menu/items, stores, and final fact snapshots.
5. External POS repository/runtime hookup if that source is not available inside this repo with explicit authorization.
6. P5 durable queues, retries, checkpoints, dead letters, and worker execution.
7. P6 Agent runtime/provider integration and Agent action governance.
8. Production dashboarding, paging, mature SLOs, incident management, cloud secret management, and deployment hardening.

## Stop boundaries

Stop or replan rather than expanding this contract if the mapping or delivery path requires:

1. Real production credentials, bearer tokens, payment PANs, raw customer PII, or merchant-sensitive payload details.
2. Bypassing P2 auth/tenancy or P3 observability.
3. External repository changes without explicit authorization and source truth.
4. PostHog, Aegis, logs, or analytics exports as operating-fact sources.
5. P5 durable worker completion or P6 Agent runtime completion claims.
