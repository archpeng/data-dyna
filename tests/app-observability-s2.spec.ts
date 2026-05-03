import assert from "node:assert/strict";
import { buildDataDynaApp } from "../src/app/app.ts";
import { loadRuntimeConfig } from "../src/app/config/runtime-config.ts";
import { InMemoryRuntimeLogSink, type RuntimeLogEvent, type RuntimeLogRecord } from "../src/app/observability/runtime-log.ts";
import type { DataDynaEvent } from "../src/contracts/event-contract.ts";
import { InMemoryRawEventStore } from "../src/ingestion/raw-event-store.ts";

const runId = `observability-s2-${Date.now()}`;
const authorizedToken = "<local-placeholder-token-observability-s2>";
const invalidToken = "<invalid-observability-token-that-must-not-log>";
const ingestionCredential = {
  credentialId: "local-pos-observability-s2",
  token: authorizedToken,
  merchantId: "merchant-observability-s2",
  storeIds: ["store-observability-s2"],
  producer: {
    service: "pos-lite-cashier",
    environment: "test",
  },
  source: "pos",
};

const logSink = new InMemoryRuntimeLogSink();
const store = new InMemoryRawEventStore();
const app = buildDataDynaApp({
  config: loadRuntimeConfig({
    DATA_DYNA_RUNTIME_ENV: "test",
    DATA_DYNA_INGESTION_CREDENTIALS_JSON: JSON.stringify([ingestionCredential]),
  }),
  rawEventStore: store,
  observabilityLogSink: logSink,
});

try {
  const noCredentialResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: {
      "content-type": "application/json",
      "x-request-id": `${runId}:request:no-credential`,
      "x-correlation-id": `${runId}:correlation:no-credential`,
    },
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
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${invalidToken}`,
      "x-request-id": `${runId}:request:invalid-credential`,
    },
    payload: JSON.stringify(
      validEvent({
        eventId: `${runId}:event:invalid-credential`,
        idempotencyKey: `${runId}:idempotency:invalid-credential`,
      }),
    ),
  });
  assert.equal(invalidCredentialResponse.statusCode, 401);

  const acceptedIdempotencyKey = `${runId}:idempotency:accepted-secret`;
  const acceptedResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${authorizedToken}`,
      "x-request-id": `${runId}:request:accepted`,
      "x-correlation-id": `${runId}:correlation:accepted-header`,
    },
    payload: JSON.stringify(
      validEvent({
        eventId: `${runId}:event:accepted-sensitive`,
        idempotencyKey: acceptedIdempotencyKey,
        correlationId: `${runId}:correlation:accepted-event`,
      }),
    ),
  });
  assert.equal(acceptedResponse.statusCode, 202);

  const duplicateResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${authorizedToken}`,
      "x-request-id": `${runId}:request:duplicate`,
      "x-correlation-id": `${runId}:correlation:duplicate-header`,
    },
    payload: JSON.stringify(
      validEvent({
        eventId: `${runId}:event:duplicate-sensitive`,
        idempotencyKey: acceptedIdempotencyKey,
        correlationId: `${runId}:correlation:duplicate-event`,
      }),
    ),
  });
  assert.equal(duplicateResponse.statusCode, 202);

  const invalidSchemaPayload = {
    testRunId: runId,
    rawPayloadSecret: "raw-payload-secret-must-not-log",
    idempotency: {
      key: `${runId}:idempotency:invalid-schema-secret`,
    },
  };
  const invalidSchemaResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${authorizedToken}`,
      "x-request-id": `${runId}:request:invalid-schema`,
    },
    payload: JSON.stringify(invalidSchemaPayload),
  });
  assert.equal(invalidSchemaResponse.statusCode, 400);

  const tenantMismatchIdempotencyKey = `${runId}:idempotency:tenant-mismatch-secret`;
  const tenantMismatchResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${authorizedToken}`,
      "x-request-id": `${runId}:request:tenant-mismatch`,
    },
    payload: JSON.stringify(
      validEvent({
        eventId: `${runId}:event:tenant-mismatch-sensitive`,
        idempotencyKey: tenantMismatchIdempotencyKey,
        merchantId: "merchant-observability-s2-other",
        storeId: "store-observability-s2-other",
      }),
    ),
  });
  assert.equal(tenantMismatchResponse.statusCode, 403);

  const batchResponse = await app.inject({
    method: "POST",
    url: "/events/batch",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${authorizedToken}`,
      "x-request-id": `${runId}:request:batch`,
      "x-correlation-id": `${runId}:correlation:batch`,
    },
    payload: JSON.stringify([
      validEvent({
        eventId: `${runId}:event:batch-accepted-sensitive`,
        idempotencyKey: `${runId}:idempotency:batch-accepted-secret`,
      }),
      validEvent({
        eventId: `${runId}:event:batch-tenant-mismatch-sensitive`,
        idempotencyKey: `${runId}:idempotency:batch-tenant-mismatch-secret`,
        merchantId: "merchant-observability-s2-other",
        storeId: "store-observability-s2-other",
      }),
    ]),
  });
  assert.equal(batchResponse.statusCode, 207);

  const authRejectedLogs = recordsFor("ingestion.auth.rejected");
  assert.equal(authRejectedLogs.length, 2);
  assert.equal(authRejectedLogs[0]?.route, "/events");
  assert.equal(authRejectedLogs[0]?.method, "POST");
  assert.equal(authRejectedLogs[0]?.status, 401);
  assert.equal(authRejectedLogs[0]?.outcome, "unauthorized");
  assert.equal(authRejectedLogs[0]?.error_code, "UNAUTHORIZED");

  const acceptedLog = latestRecord("ingestion.event.accepted");
  assert.equal(acceptedLog.route, "/events/batch");
  assert.equal(acceptedLog.credential_id, ingestionCredential.credentialId);
  assert.equal(acceptedLog.merchant_id, ingestionCredential.merchantId);
  assert.equal(acceptedLog.store_id, ingestionCredential.storeIds[0]);
  assert.equal(acceptedLog.source, ingestionCredential.source);
  assert.equal(acceptedLog.producer_service, ingestionCredential.producer.service);
  assert.equal(acceptedLog.producer_environment, ingestionCredential.producer.environment);
  assert.equal(acceptedLog.event_domain, "transaction_scene");
  assert.equal(acceptedLog.event_name, "pos.order_paid");

  const duplicateLog = latestRecord("ingestion.event.duplicate");
  assert.equal(duplicateLog.outcome, "duplicate");
  assert.equal(duplicateLog.correlation_id, `${runId}:correlation:duplicate-header`);

  const invalidLog = latestRecord("ingestion.event.invalid");
  assert.equal(invalidLog.status, 400);
  assert.equal(invalidLog.error_code, "invalid_schema");
  assert.equal(invalidLog.credential_id, ingestionCredential.credentialId);

  const tenantMismatchLog = latestRecord("ingestion.event.tenant_policy_rejected");
  assert.equal(tenantMismatchLog.status, 403);
  assert.equal(tenantMismatchLog.outcome, "tenant_mismatch");
  assert.equal(tenantMismatchLog.error_code, "TENANT_MISMATCH");
  assert.equal(tenantMismatchLog.credential_id, ingestionCredential.credentialId);

  const batchCompletedLog = latestRecord("ingestion.batch.completed");
  assert.equal(batchCompletedLog.route, "/events/batch");
  assert.equal(batchCompletedLog.status, 207);
  assert.equal(batchCompletedLog.batch_size, 2);
  assert.equal(batchCompletedLog.accepted_count, 1);
  assert.equal(batchCompletedLog.tenant_policy_failure_count, 1);

  const requestCompletedLogs = recordsFor("runtime.request.completed");
  assert.ok(requestCompletedLogs.length >= 7);
  assert.ok(requestCompletedLogs.every((record) => typeof record.request_id === "string"));
  assert.ok(requestCompletedLogs.every((record) => typeof record.correlation_id === "string"));
  assert.ok(requestCompletedLogs.every((record) => typeof record.duration_ms === "number"));
  assert.ok(requestCompletedLogs.some((record) => record.route === "/events/batch" && record.status === 207));

  assertNoForbiddenLogOutput([
    authorizedToken,
    invalidToken,
    acceptedIdempotencyKey,
    tenantMismatchIdempotencyKey,
    `${runId}:idempotency:no-credential`,
    `${runId}:idempotency:invalid-credential`,
    `${runId}:idempotency:invalid-schema-secret`,
    `${runId}:idempotency:batch-accepted-secret`,
    `${runId}:idempotency:batch-tenant-mismatch-secret`,
    `${runId}:member-sensitive`,
    `${runId}:order-sensitive`,
    `${runId}:trace-sensitive`,
    "raw-payload-secret-must-not-log",
    "merchant-sensitive-payload-detail",
    "Authorization",
    "DATA_DYNA_INGESTION_CREDENTIALS_JSON",
    "storeIds",
  ]);
} finally {
  await app.close();
}

function recordsFor(event: RuntimeLogEvent): RuntimeLogRecord[] {
  return logSink.records.filter((record) => record.event === event);
}

function latestRecord(event: RuntimeLogEvent): RuntimeLogRecord {
  const record = recordsFor(event).at(-1);
  assert.ok(record, `expected log record for ${event}`);
  return record;
}

function assertNoForbiddenLogOutput(forbiddenValues: string[]): void {
  const serialized = JSON.stringify(logSink.records);
  for (const value of forbiddenValues) {
    assert.equal(serialized.includes(value), false, `log output leaked ${value}`);
  }
}

function validEvent(options: {
  eventId: string;
  idempotencyKey: string;
  correlationId?: string;
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
      brandId: "brand-observability-s2",
      merchantId: options.merchantId ?? ingestionCredential.merchantId,
      storeId: options.storeId ?? ingestionCredential.storeIds[0],
      memberId: `${runId}:member-sensitive`,
      actorType: "cashier",
    },
    correlation: {
      eventId: options.eventId,
      traceId: `${runId}:trace-sensitive`,
      correlationId: options.correlationId,
    },
    entity: {
      type: "order",
      id: `${runId}:order-sensitive`,
    },
    properties: {
      merchantSensitiveDetail: "merchant-sensitive-payload-detail",
      amount: 42.5,
    },
    idempotency: {
      key: options.idempotencyKey,
      scope: "store",
    },
  };
}
