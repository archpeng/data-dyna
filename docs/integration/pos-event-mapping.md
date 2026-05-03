# POS Order-Paid Event Mapping

Status: POS order-paid source-to-target mapping for the P4 POS pilot. `DD-P4-S1` defined this mapping, `DD-P4-S2` implemented the mapper proof, `DD-P4-S3` delivered the mapped event to `/events`, and `DD-P4-S4` documents the local/test runbook and replay/backfill handoff.

## Pilot identity

| Field | Pilot decision |
|---|---|
| Producer family | POS cashier / transaction scene |
| Event | `pos.order_paid` |
| Data Dyna source | `pos` |
| Data Dyna domain | `transaction_scene` |
| Transport | authenticated `POST /events` |
| Idempotency scope | `store` |
| Credential source | P2 `DATA_DYNA_INGESTION_CREDENTIALS_JSON` with placeholder-only local/test token values |
| Runtime observability | P3 `/events` logs and metrics only |

The pilot fixture is sanitized local/test data. It does not contain bearer tokens, payment PANs, raw payment authorization data, customer names, phone numbers, member/customer/device ids, employee ids, full basket details, item names, discounts, exact sale amount, or production merchant data.

## Sanitized POS producer fixture

`DD-P4-S2` may encode this shape as a test fixture or equivalent mapper input. Field names are producer-side names, not a new Data Dyna contract.

```json
{
  "schemaVersion": "pos.order-paid.v1",
  "source": "pos",
  "merchantId": "merchant-local-a",
  "storeId": "store-local-a",
  "brandId": "brand-local-a",
  "orderId": "order-local-0001",
  "paymentId": "payment-local-0001",
  "orderVersion": "paid-1",
  "paidAt": "2026-05-03T12:00:00.000Z",
  "emittedAt": "2026-05-03T12:00:01.000Z",
  "producer": {
    "service": "pos-lite-cashier",
    "app": "pos-register",
    "environment": "test"
  },
  "cashierActorType": "cashier",
  "orderChannel": "in_store_pos",
  "paymentStatus": "paid",
  "paymentMethodType": "card_present",
  "currency": "CNY",
  "lineItemCount": 2
}
```

Fixture rules:

1. `merchantId`, `storeId`, `producer.service`, `producer.environment`, and `source: pos` must match the authenticated P2 credential.
2. `orderId` and `paymentId` are sanitized local/test identifiers. Real production identifiers are allowed only as event/entity/idempotency inputs and must not become metric labels or default log fields.
3. `paymentMethodType` is a bounded category only. The fixture must not include PAN, card token, authorization code, acquirer reference, customer cardholder data, or raw payment gateway payload.
4. `lineItemCount` is an aggregate count only. Product names, SKU lists, modifiers, discounts, exact sale amount, and basket detail remain out of this pilot fixture unless a later contract review explicitly accepts them.
5. The fixture is the POS source fact for mapping. PostHog, Aegis, logs, and analytics exports are not operating-fact sources.

## Target `DataDynaEvent`

The mapped event must parse with `DataDynaEventSchema` from `src/contracts/event-contract.ts`.

```json
{
  "version": "event-contract.v1",
  "source": "pos",
  "domain": "transaction_scene",
  "name": "pos.order_paid",
  "occurredAt": "2026-05-03T12:00:00.000Z",
  "producer": {
    "service": "pos-lite-cashier",
    "app": "pos-register",
    "environment": "test",
    "emittedAt": "2026-05-03T12:00:01.000Z",
    "schemaRef": "pos.order-paid.v1 -> data-dyna.event-contract.v1"
  },
  "identity": {
    "brandId": "brand-local-a",
    "merchantId": "merchant-local-a",
    "storeId": "store-local-a",
    "actorType": "cashier"
  },
  "correlation": {
    "eventId": "pos.order_paid:store-local-a:order-local-0001:payment-local-0001",
    "requestId": "pos-producer-request-local-0001",
    "correlationId": "pos-order:order-local-0001"
  },
  "entity": {
    "type": "order",
    "id": "order-local-0001",
    "version": "paid-1"
  },
  "properties": {
    "orderStatus": "paid",
    "paymentStatus": "paid",
    "orderChannel": "in_store_pos",
    "paymentMethodType": "card_present",
    "currency": "CNY",
    "lineItemCount": 2
  },
  "idempotency": {
    "scope": "store",
    "key": "pos.order_paid:v1:order-local-0001:payment-local-0001"
  }
}
```

## Required-field mapping

| `DataDynaEvent` field | Source fixture field / value | Rule |
|---|---|---|
| `version` | constant `event-contract.v1` | Must match `EventContractVersionSchema`. |
| `source` | constant `pos` | Must match the P2 credential `source`. |
| `domain` | constant `transaction_scene` | POS payment facts are transaction-scene events. |
| `name` | constant `pos.order_paid` | First P4 pilot event; no other producer/event is selected in this slice. |
| `occurredAt` | `paidAt` | Use when the POS order payment became paid/committed, not Data Dyna receive time. |
| `producer.service` | `producer.service` | Required and must match credential `producer.service`. Local/test pilot uses `pos-lite-cashier`. |
| `producer.app` | `producer.app` | Optional app/register label; bounded and non-secret. |
| `producer.environment` | `producer.environment` | Required for P2 accepted ingestion and must match credential `producer.environment`. |
| `producer.emittedAt` | `emittedAt` | Producer emission time; ISO datetime with offset. |
| `producer.schemaRef` | `schemaVersion` plus target contract | Optional trace of source fixture schema to Data Dyna event contract. |
| `identity.brandId` | `brandId` | Optional grouping/audit field only; not an auth key. |
| `identity.merchantId` | `merchantId` | Required by P2 accepted ingestion and must equal credential `merchantId`. |
| `identity.storeId` | `storeId` | Required by P2 accepted ingestion and must be included in credential `storeIds`. |
| `identity.actorType` | `cashierActorType` | Must map to the existing enum value `cashier`. |
| `identity.memberId` | omitted | Not needed for this pilot and must not be inferred from customer data. |
| `identity.customerId` | omitted | Customer identifiers are out of this pilot. |
| `identity.deviceId` | omitted | Device identifiers are out of this pilot. |
| `correlation.eventId` | `pos.order_paid:{storeId}:{orderId}:{paymentId}` | Required event identifier. It must be unique for the paid order/payment fact but must not be used as a metric label. |
| `correlation.requestId` | producer request id such as `pos-producer-request-local-0001` | Optional safe request correlation; generated by the producer/delivery harness in local/test. |
| `correlation.correlationId` | `pos-order:{orderId}` | Optional investigation correlation for all events derived from the same POS order. |
| `correlation.traceId` | omitted | Future distributed trace surface; not required for DD-P4-S1. |
| `correlation.sessionId` | omitted | Session identifiers are out of this pilot. |
| `correlation.causationId` | omitted | Can link to a future `pos.order_opened` event, but that event remains residual. |
| `entity.type` | constant `order` | Existing event-contract entity enum supports `order`. |
| `entity.id` | `orderId` | Stable POS order id. It may be persisted, but must not become a default metric label or log field. |
| `entity.version` | `orderVersion` | Optional order-state version, e.g. `paid-1`. |
| `properties.orderStatus` | constant `paid` | Sanitized status only. |
| `properties.paymentStatus` | `paymentStatus` | Sanitized payment state only. |
| `properties.orderChannel` | `orderChannel` | Bounded channel enum/value from POS. |
| `properties.paymentMethodType` | `paymentMethodType` | Bounded method category only; no PAN/token/auth detail. |
| `properties.currency` | `currency` | Currency code only; no exact tender breakdown. |
| `properties.lineItemCount` | `lineItemCount` | Aggregate count only; no item names, SKU ids, or basket detail. |
| `idempotency.scope` | constant `store` | Required P2/P4 external-ingestion scope. |
| `idempotency.key` | `pos.order_paid:v1:{orderId}:{paymentId}` | Deterministic producer-side key. Replays of the same paid order/payment fact must reuse the same key. |

## Deterministic idempotency strategy

The producer-side idempotency key for this pilot is:

```text
pos.order_paid:v1:{orderId}:{paymentId}
```

Rules:

1. `idempotency.scope` is always `store`.
2. The key is deterministic for one paid order/payment fact and stable across retry/backfill.
3. The P2 canonical idempotency identity remains `merchantId + storeId + producer.service + producer.environment + source + idempotency.scope + idempotency.key`.
4. A replay of the same paid order/payment fact should return a Data Dyna duplicate, not a second accepted business event.
5. If a POS source can produce multiple paid facts for one order in the future, the mapper must include the stable payment fact identifier in `paymentId`; broad multi-payment behavior is not part of DD-P4-S1.
6. The idempotency key must not be logged, traced, exposed in metric labels, or used as observability correlation.

## P2 tenant-policy outcomes

| Source condition | Data Dyna behavior |
|---|---|
| Fixture matches credential tenant/source/producer and parses | `202` accepted or `202` duplicate. |
| Missing `merchantId`, `storeId`, `producer.environment`, or non-`store` idempotency scope | `400` `TENANT_IDENTITY_REQUIRED`, invalid audit only, no accepted row. |
| Mismatched `merchantId`, `storeId`, `producer.service`, `producer.environment`, or `source` | `403` `TENANT_MISMATCH`, invalid audit only, no accepted row. |
| Missing/malformed/invalid bearer token | `401` `UNAUTHORIZED`, no ingestion handler call, no accepted or invalid persistence side effects. |
| Schema-invalid payload | `400` invalid schema, invalid audit only. |

The Data Dyna runtime must not stamp or repair tenant/source fields. A producer mapper that cannot provide matching tenant/source values must stop before accepted ingestion.

## P3 observability mapping

The following fields may appear in P3 logs/metrics after schema parsing and auth where allowed:

- `source = pos`.
- `producer_service = pos-lite-cashier`.
- `producer_environment = test`.
- `event_domain = transaction_scene`.
- `event_name = pos.order_paid`.
- Classified `outcome` and `error_code` values.

The following mapped fields must not be emitted as default logs or metric labels:

- bearer token values or credential JSON;
- `idempotency.key`;
- raw fixture payload or `properties` object;
- `identity.memberId`, `identity.customerId`, `identity.deviceId`;
- `correlation.sessionId`;
- `entity.id` and raw order/payment ids as metric labels;
- payment PANs, payment authorization data, customer PII, employee IDs, item-level basket details, exact sale amount, or production merchant data.

## Validation handoff

`DD-P4-S1` is docs-only and validates with:

```bash
npm run test:contracts
npm run check:plan
git diff --check
```

`DD-P4-S2` should turn this mapping into the smallest mapper/fixture contract test. That future test should prove the target event parses as `source: pos`, `domain: transaction_scene`, `name: pos.order_paid`, and `idempotency.scope = store`, with invalid or unsafe fixture variants rejected before accepted ingestion.

## Residuals

This mapping does not complete:

1. POS `pos.order_opened`, `pos.refund_recorded`, cancellation, employee-operation detail, or broader cashier context.
2. Exact sale amount, item-level basket details, customer/member/device identity, or payment gateway detail mapping.
3. Mini-program, mobile-HQ, backend fact sync, or non-POS producer mappings.
4. External POS repository/runtime hookup beyond the Data Dyna-side local/test `/events` proof.
5. P5 durable workers, checkpoints, retries, dead letters, or worker idempotency.
6. P6 Agent runtime/provider integration.
7. Production dashboarding, paging, mature SLOs, incident management, cloud secret management, or deployment hardening.
