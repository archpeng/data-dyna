import assert from "node:assert/strict";
import { buildDataDynaApp } from "../src/app/app.ts";
import { loadRuntimeConfig } from "../src/app/config/runtime-config.ts";
import { InMemoryRuntimeLogSink, type RuntimeLogEvent } from "../src/app/observability/runtime-log.ts";
import {
  InMemoryRuntimeMetricSink,
  type RuntimeMetricLabels,
  type RuntimeMetricName,
} from "../src/app/observability/runtime-metrics.ts";
import type { DataDynaEvent } from "../src/contracts/event-contract.ts";
import { InMemoryRawEventStore } from "../src/ingestion/raw-event-store.ts";

const runId = `observability-probe-${Date.now()}`;
const authorizedToken = "<local-placeholder-token-observability-probe>";
const invalidToken = "<invalid-observability-probe-token-that-must-not-print>";
const ingestionCredential = {
  credentialId: "local-pos-observability-probe",
  token: authorizedToken,
  merchantId: "merchant-observability-probe",
  storeIds: ["store-observability-probe"],
  producer: {
    service: "pos-lite-cashier",
    environment: "test",
  },
  source: "pos",
};

const logSink = new InMemoryRuntimeLogSink();
const metricSink = new InMemoryRuntimeMetricSink();
const app = buildDataDynaApp({
  config: loadRuntimeConfig({
    DATA_DYNA_RUNTIME_ENV: "test",
    DATA_DYNA_INGESTION_CREDENTIALS_JSON: JSON.stringify([ingestionCredential]),
  }),
  rawEventStore: new InMemoryRawEventStore(),
  observabilityLogSink: logSink,
  observabilityMetricSink: metricSink,
});

try {
  const health = await app.inject({ method: "GET", url: "/healthz" });
  assert.equal(health.statusCode, 200);

  const missingCredential = await postEvent(validEvent(`${runId}:event:missing-credential`, `${runId}:idempotency:missing`));
  assert.equal(missingCredential.statusCode, 401);

  const invalidCredential = await postEvent(
    validEvent(`${runId}:event:invalid-credential`, `${runId}:idempotency:invalid-credential`),
    { authorization: `Bearer ${invalidToken}` },
  );
  assert.equal(invalidCredential.statusCode, 401);

  const acceptedIdempotencyKey = `${runId}:idempotency:accepted-secret`;
  const acceptedEventId = `${runId}:event:accepted-sensitive`;
  const accepted = await postEvent(validEvent(acceptedEventId, acceptedIdempotencyKey), authorizationHeader());
  assert.equal(accepted.statusCode, 202);

  const duplicate = await postEvent(
    validEvent(`${runId}:event:duplicate-sensitive`, acceptedIdempotencyKey),
    authorizationHeader(),
  );
  assert.equal(duplicate.statusCode, 202);

  const invalidSchema = await postEvent(
    {
      probeRunId: runId,
      rawPayloadSecret: "raw-observability-probe-secret",
      idempotency: { key: `${runId}:idempotency:invalid-schema-secret` },
    },
    authorizationHeader(),
  );
  assert.equal(invalidSchema.statusCode, 400);

  const tenantMismatch = await postEvent(
    validEvent(`${runId}:event:tenant-mismatch-sensitive`, `${runId}:idempotency:tenant-mismatch-secret`, {
      merchantId: "merchant-observability-probe-other",
      storeId: "store-observability-probe-other",
    }),
    authorizationHeader(),
  );
  assert.equal(tenantMismatch.statusCode, 403);

  const summary = {
    service: "data-dyna",
    runtimeEnvironment: "test",
    healthz: {
      status: health.statusCode,
      ok: health.json().ok === true,
    },
    logEvents: countLogEvents(),
    metricCounters: {
      httpRequests: {
        unauthorized: metricSum("data_dyna_http_requests_total", {
          route: "/events",
          method: "POST",
          status_class: "4xx",
          outcome: "unauthorized",
        }),
        accepted: metricSum("data_dyna_http_requests_total", {
          route: "/events",
          method: "POST",
          status_class: "2xx",
          outcome: "accepted",
        }),
        duplicate: metricSum("data_dyna_http_requests_total", {
          route: "/events",
          method: "POST",
          status_class: "2xx",
          outcome: "duplicate",
        }),
        invalid: metricSum("data_dyna_http_requests_total", {
          route: "/events",
          method: "POST",
          status_class: "4xx",
          outcome: "invalid",
        }),
        tenantMismatch: metricSum("data_dyna_http_requests_total", {
          route: "/events",
          method: "POST",
          status_class: "4xx",
          outcome: "tenant_mismatch",
        }),
      },
      authRejections: metricSum("data_dyna_ingestion_auth_rejections_total", {
        route: "/events",
        method: "POST",
        error_code: "UNAUTHORIZED",
      }),
      ingestionEvents: {
        accepted: metricSum("data_dyna_ingestion_events_total", { route: "/events", outcome: "accepted" }),
        duplicate: metricSum("data_dyna_ingestion_events_total", { route: "/events", outcome: "duplicate" }),
        invalid: metricSum("data_dyna_ingestion_events_total", {
          route: "/events",
          outcome: "invalid",
          error_code: "invalid_schema",
        }),
        tenantMismatch: metricSum("data_dyna_ingestion_events_total", {
          route: "/events",
          outcome: "tenant_mismatch",
          error_code: "TENANT_MISMATCH",
        }),
      },
      tenantPolicyFailures: metricSum("data_dyna_ingestion_tenant_policy_failures_total", {
        error_code: "TENANT_MISMATCH",
      }),
      durationObservations: metricSink.records.filter((record) => record.name === "data_dyna_http_request_duration_ms")
        .length,
    },
  };

  assert.deepEqual(summary.logEvents, {
    "ingestion.auth.rejected": 2,
    "runtime.request.completed": 6,
    "ingestion.event.accepted": 1,
    "ingestion.event.duplicate": 1,
    "ingestion.event.invalid": 1,
    "ingestion.event.tenant_policy_rejected": 1,
  });
  assert.equal(summary.metricCounters.httpRequests.unauthorized, 2);
  assert.equal(summary.metricCounters.httpRequests.accepted, 1);
  assert.equal(summary.metricCounters.httpRequests.duplicate, 1);
  assert.equal(summary.metricCounters.httpRequests.invalid, 1);
  assert.equal(summary.metricCounters.httpRequests.tenantMismatch, 1);
  assert.equal(summary.metricCounters.authRejections, 2);
  assert.equal(summary.metricCounters.ingestionEvents.accepted, 1);
  assert.equal(summary.metricCounters.ingestionEvents.duplicate, 1);
  assert.equal(summary.metricCounters.ingestionEvents.invalid, 1);
  assert.equal(summary.metricCounters.ingestionEvents.tenantMismatch, 1);
  assert.equal(summary.metricCounters.tenantPolicyFailures, 1);
  assert.equal(summary.metricCounters.durationObservations, 6);

  assertNoForbiddenOutput(JSON.stringify([...logSink.records, ...metricSink.records]), [
    authorizedToken,
    invalidToken,
    acceptedIdempotencyKey,
    acceptedEventId,
    `${runId}:idempotency:missing`,
    `${runId}:idempotency:invalid-credential`,
    `${runId}:idempotency:invalid-schema-secret`,
    `${runId}:idempotency:tenant-mismatch-secret`,
    "raw-observability-probe-secret",
    "merchant-sensitive-observability-probe-detail",
    "Authorization",
    "DATA_DYNA_INGESTION_CREDENTIALS_JSON",
    "storeIds",
  ]);
  assertNoForbiddenOutput(JSON.stringify(summary), [
    runId,
    authorizedToken,
    invalidToken,
    ingestionCredential.credentialId,
    ingestionCredential.merchantId,
    ingestionCredential.storeIds[0],
    acceptedIdempotencyKey,
    acceptedEventId,
    "raw-observability-probe-secret",
  ]);

  console.log("Runtime observability probe passed:");
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await app.close();
}

async function postEvent(payload: unknown, headers: Record<string, string> = {}) {
  return app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json", ...headers },
    payload: JSON.stringify(payload),
  });
}

function authorizationHeader(): Record<string, string> {
  return { authorization: `Bearer ${authorizedToken}` };
}

function metricSum(name: RuntimeMetricName, labels: RuntimeMetricLabels): number {
  return metricSink.sum(name, labels);
}

function countLogEvents(): Record<RuntimeLogEvent, number> {
  return logSink.records.reduce(
    (counts, record) => ({
      ...counts,
      [record.event]: (counts[record.event] ?? 0) + 1,
    }),
    {} as Record<RuntimeLogEvent, number>,
  );
}

function assertNoForbiddenOutput(output: string, forbiddenValues: string[]): void {
  for (const value of forbiddenValues) {
    assert.equal(output.includes(value), false, `observability probe output leaked ${value}`);
  }
}

function validEvent(
  eventId: string,
  idempotencyKey: string,
  overrides: { merchantId?: string; storeId?: string } = {},
): DataDynaEvent {
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
      brandId: "brand-observability-probe",
      merchantId: overrides.merchantId ?? ingestionCredential.merchantId,
      storeId: overrides.storeId ?? ingestionCredential.storeIds[0],
      memberId: `${runId}:member-sensitive`,
      actorType: "cashier",
    },
    correlation: {
      eventId,
      traceId: `${runId}:trace-sensitive`,
    },
    entity: {
      type: "order",
      id: `${runId}:order-sensitive`,
    },
    properties: {
      merchantSensitiveDetail: "merchant-sensitive-observability-probe-detail",
      amount: 42.5,
    },
    idempotency: {
      key: idempotencyKey,
      scope: "store",
    },
  };
}
