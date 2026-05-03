import assert from "node:assert/strict";
import { buildDataDynaApp } from "../src/app/app.ts";
import { loadRuntimeConfig } from "../src/app/config/runtime-config.ts";
import {
  InMemoryRuntimeMetricSink,
  type RuntimeMetricLabels,
  type RuntimeMetricName,
} from "../src/app/observability/runtime-metrics.ts";
import type { DataDynaEvent } from "../src/contracts/event-contract.ts";
import { InMemoryRawEventStore } from "../src/ingestion/raw-event-store.ts";

const runId = `observability-s3-${Date.now()}`;
const authorizedToken = "<local-placeholder-token-observability-s3>";
const invalidToken = "<invalid-observability-s3-token-that-must-not-metric>";
const ingestionCredential = {
  credentialId: "local-pos-observability-s3",
  token: authorizedToken,
  merchantId: "merchant-observability-s3",
  storeIds: ["store-observability-s3"],
  producer: {
    service: "pos-lite-cashier",
    environment: "test",
  },
  source: "pos",
};

const metricSink = new InMemoryRuntimeMetricSink();
const app = buildDataDynaApp({
  config: loadRuntimeConfig({
    DATA_DYNA_RUNTIME_ENV: "test",
    DATA_DYNA_INGESTION_CREDENTIALS_JSON: JSON.stringify([ingestionCredential]),
  }),
  rawEventStore: new InMemoryRawEventStore(),
  observabilityMetricSink: metricSink,
});

try {
  const noCredentialResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify(
      validEvent({
        eventId: `${runId}:event:no-credential`,
        idempotencyKey: `${runId}:idempotency:no-credential`,
      }),
    ),
  });
  assert.equal(noCredentialResponse.statusCode, 401);

  const invalidCredentialResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json", authorization: `Bearer ${invalidToken}` },
    payload: JSON.stringify(
      validEvent({
        eventId: `${runId}:event:invalid-credential`,
        idempotencyKey: `${runId}:idempotency:invalid-credential`,
      }),
    ),
  });
  assert.equal(invalidCredentialResponse.statusCode, 401);

  const acceptedIdempotencyKey = `${runId}:idempotency:accepted-secret`;
  const acceptedEventId = `${runId}:event:accepted-sensitive`;
  const acceptedResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json", authorization: `Bearer ${authorizedToken}` },
    payload: JSON.stringify(
      validEvent({
        eventId: acceptedEventId,
        idempotencyKey: acceptedIdempotencyKey,
      }),
    ),
  });
  assert.equal(acceptedResponse.statusCode, 202);

  const duplicateResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json", authorization: `Bearer ${authorizedToken}` },
    payload: JSON.stringify(
      validEvent({
        eventId: `${runId}:event:duplicate-sensitive`,
        idempotencyKey: acceptedIdempotencyKey,
      }),
    ),
  });
  assert.equal(duplicateResponse.statusCode, 202);

  const runtimeErrorResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json", authorization: `Bearer ${authorizedToken}` },
    payload: JSON.stringify(
      validEvent({
        eventId: acceptedEventId,
        idempotencyKey: `${runId}:idempotency:runtime-error-secret`,
      }),
    ),
  });
  assert.equal(runtimeErrorResponse.statusCode, 500);

  const invalidSchemaResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json", authorization: `Bearer ${authorizedToken}` },
    payload: JSON.stringify({ rawPayloadSecret: "raw-metric-payload-secret", testRunId: runId }),
  });
  assert.equal(invalidSchemaResponse.statusCode, 400);

  const tenantMismatchResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json", authorization: `Bearer ${authorizedToken}` },
    payload: JSON.stringify(
      validEvent({
        eventId: `${runId}:event:tenant-mismatch-sensitive`,
        idempotencyKey: `${runId}:idempotency:tenant-mismatch-secret`,
        merchantId: "merchant-observability-s3-other",
        storeId: "store-observability-s3-other",
      }),
    ),
  });
  assert.equal(tenantMismatchResponse.statusCode, 403);

  const tenantIdentityRequiredPayload = validEvent({
    eventId: `${runId}:event:tenant-identity-required-sensitive`,
    idempotencyKey: `${runId}:idempotency:tenant-identity-required-secret`,
  });
  delete tenantIdentityRequiredPayload.identity.storeId;
  const tenantIdentityRequiredResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json", authorization: `Bearer ${authorizedToken}` },
    payload: JSON.stringify(tenantIdentityRequiredPayload),
  });
  assert.equal(tenantIdentityRequiredResponse.statusCode, 400);

  const batchResponse = await app.inject({
    method: "POST",
    url: "/events/batch",
    headers: { "content-type": "application/json", authorization: `Bearer ${authorizedToken}` },
    payload: JSON.stringify([
      validEvent({
        eventId: `${runId}:event:batch-accepted-sensitive`,
        idempotencyKey: `${runId}:idempotency:batch-accepted-secret`,
      }),
      validEvent({
        eventId: `${runId}:event:batch-tenant-mismatch-sensitive`,
        idempotencyKey: `${runId}:idempotency:batch-tenant-mismatch-secret`,
        merchantId: "merchant-observability-s3-other",
        storeId: "store-observability-s3-other",
      }),
    ]),
  });
  assert.equal(batchResponse.statusCode, 207);

  assert.equal(
    metricSum("data_dyna_ingestion_auth_rejections_total", {
      route: "/events",
      method: "POST",
      error_code: "UNAUTHORIZED",
    }),
    2,
  );
  assert.equal(
    metricSum("data_dyna_http_requests_total", {
      route: "/events",
      method: "POST",
      status_class: "4xx",
      outcome: "unauthorized",
    }),
    2,
  );
  assert.equal(
    metricSum("data_dyna_ingestion_events_total", {
      route: "/events",
      outcome: "accepted",
      source: "pos",
      producer_service: "pos-lite-cashier",
      producer_environment: "test",
      event_domain: "transaction_scene",
      event_name: "pos.order_paid",
    }),
    1,
  );
  assert.equal(
    metricSum("data_dyna_ingestion_events_total", {
      route: "/events",
      outcome: "duplicate",
      source: "pos",
      producer_service: "pos-lite-cashier",
      producer_environment: "test",
      event_domain: "transaction_scene",
      event_name: "pos.order_paid",
    }),
    1,
  );
  assert.equal(
    metricSum("data_dyna_ingestion_events_total", {
      route: "/events",
      outcome: "invalid",
      error_code: "invalid_schema",
      source: "pos",
      producer_service: "pos-lite-cashier",
      producer_environment: "test",
    }),
    1,
  );
  assert.equal(
    metricSum("data_dyna_ingestion_events_total", {
      route: "/events",
      outcome: "tenant_mismatch",
      error_code: "TENANT_MISMATCH",
      source: "pos",
      producer_service: "pos-lite-cashier",
      producer_environment: "test",
    }),
    1,
  );
  assert.equal(
    metricSum("data_dyna_ingestion_tenant_policy_failures_total", {
      source: "pos",
      producer_service: "pos-lite-cashier",
      producer_environment: "test",
      error_code: "TENANT_MISMATCH",
    }),
    2,
  );
  assert.equal(
    metricSum("data_dyna_ingestion_tenant_policy_failures_total", {
      source: "pos",
      producer_service: "pos-lite-cashier",
      producer_environment: "test",
      error_code: "TENANT_IDENTITY_REQUIRED",
    }),
    1,
  );
  assert.equal(
    metricSum("data_dyna_ingestion_batch_items_total", {
      outcome: "accepted",
      source: "pos",
      producer_service: "pos-lite-cashier",
      producer_environment: "test",
      event_domain: "transaction_scene",
      event_name: "pos.order_paid",
    }),
    1,
  );
  assert.equal(
    metricSum("data_dyna_ingestion_batch_items_total", {
      outcome: "tenant_mismatch",
      error_code: "TENANT_MISMATCH",
      source: "pos",
      producer_service: "pos-lite-cashier",
      producer_environment: "test",
    }),
    1,
  );
  assert.equal(
    metricSum("data_dyna_runtime_errors_total", {
      route: "/events",
      method: "POST",
      error_code: "unexpected_error",
    }),
    1,
  );

  const durationMetrics = metricSink.records.filter((record) => record.name === "data_dyna_http_request_duration_ms");
  assert.ok(durationMetrics.length >= 9);
  assert.ok(durationMetrics.every((record) => record.type === "histogram"));
  assert.ok(durationMetrics.every((record) => record.value >= 0));
  assert.ok(durationMetrics.some((record) => record.labels.route === "/events/batch" && record.labels.status_class === "2xx"));

  assertNoForbiddenMetricLabels();
  assertNoForbiddenMetricOutput([
    runId,
    authorizedToken,
    invalidToken,
    ingestionCredential.credentialId,
    ingestionCredential.merchantId,
    ingestionCredential.storeIds[0],
    acceptedIdempotencyKey,
    acceptedEventId,
    "raw-metric-payload-secret",
    "merchant-sensitive-metric-payload-detail",
    "Authorization",
    "DATA_DYNA_INGESTION_CREDENTIALS_JSON",
    "storeIds",
  ]);
} finally {
  await app.close();
}

function metricSum(name: RuntimeMetricName, labels: RuntimeMetricLabels): number {
  return metricSink.sum(name, labels);
}

function assertNoForbiddenMetricLabels(): void {
  const allowedMetricLabelKeys = new Set([
    "route",
    "method",
    "status_class",
    "outcome",
    "error_code",
    "source",
    "producer_service",
    "producer_environment",
    "event_domain",
    "event_name",
  ]);
  const forbiddenMetricLabelKeys = new Set([
    "merchant_id",
    "store_id",
    "credential_id",
    "brand_id",
    "event_id",
    "idempotency_key",
    "entity_id",
    "member_id",
    "customer_id",
    "device_id",
    "session_id",
    "raw_url",
    "raw_ip",
    "token",
    "authorization",
  ]);

  for (const record of metricSink.records) {
    for (const key of Object.keys(record.labels)) {
      assert.equal(allowedMetricLabelKeys.has(key), true, `unexpected metric label ${key}`);
      assert.equal(forbiddenMetricLabelKeys.has(key), false, `forbidden metric label ${key}`);
    }
  }
}

function assertNoForbiddenMetricOutput(forbiddenValues: string[]): void {
  const serialized = JSON.stringify(metricSink.records);
  for (const value of forbiddenValues) {
    assert.equal(serialized.includes(value), false, `metric output leaked ${value}`);
  }
}

function validEvent(options: {
  eventId: string;
  idempotencyKey: string;
  merchantId?: string;
  storeId?: string;
}): DataDynaEvent {
  return {
    version: "event-contract.v1",
    source: "pos",
    domain: "transaction_scene",
    name: "pos.order_paid",
    occurredAt: "2026-05-02T10:00:00.000Z",
    producer: {
      service: "pos-lite-cashier",
      environment: "test",
      emittedAt: "2026-05-02T10:00:01.000Z",
    },
    identity: {
      brandId: "brand-observability-s3",
      merchantId: options.merchantId ?? ingestionCredential.merchantId,
      storeId: options.storeId ?? ingestionCredential.storeIds[0],
      memberId: `${runId}:member-sensitive`,
      actorType: "cashier",
    },
    correlation: {
      eventId: options.eventId,
      traceId: `${runId}:trace-sensitive`,
      sessionId: `${runId}:session-sensitive`,
    },
    entity: {
      type: "order",
      id: `${runId}:order-sensitive`,
    },
    properties: {
      merchantSensitiveDetail: "merchant-sensitive-metric-payload-detail",
      amount: 42.5,
    },
    idempotency: {
      key: options.idempotencyKey,
      scope: "store",
    },
  };
}
