import assert from "node:assert/strict";
import { buildDataDynaApp } from "../src/app/app.ts";
import { loadRuntimeConfig } from "../src/app/config/runtime-config.ts";
import { InMemoryRuntimeLogSink, type RuntimeLogEvent } from "../src/app/observability/runtime-log.ts";
import {
  InMemoryRuntimeMetricSink,
  type RuntimeMetricLabels,
  type RuntimeMetricName,
} from "../src/app/observability/runtime-metrics.ts";
import {
  deliverPosOrderPaidFixtureToEvents,
  sendDataDynaEventToEvents,
  type PosEventsDeliveryTransport,
} from "../src/app/producers/pos-events-delivery.ts";
import { InMemoryRawEventStore, type InvalidRawEventRecord, type RawEventRecord } from "../src/ingestion/raw-event-store.ts";

const runId = `pos-producer-probe-${Date.now()}`;
const authorizedToken = "<local-placeholder-token-pos-producer-probe>";
const invalidToken = "<invalid-pos-producer-probe-token-that-must-not-print>";
const ingestionCredential = {
  credentialId: "local-pos-producer-probe",
  token: authorizedToken,
  merchantId: "merchant-pos-producer-probe",
  storeIds: ["store-pos-producer-probe"],
  producer: {
    service: "pos-lite-cashier",
    environment: "test",
  },
  source: "pos",
};

const store = new InMemoryRawEventStore();
const logSink = new InMemoryRuntimeLogSink();
const metricSink = new InMemoryRuntimeMetricSink();
const app = buildDataDynaApp({
  config: loadRuntimeConfig({
    DATA_DYNA_RUNTIME_ENV: "test",
    DATA_DYNA_INGESTION_CREDENTIALS_JSON: JSON.stringify([ingestionCredential]),
  }),
  rawEventStore: store,
  observabilityLogSink: logSink,
  observabilityMetricSink: metricSink,
});

const transport: PosEventsDeliveryTransport = async (request) => {
  const response = await app.inject({
    method: request.method,
    url: request.path,
    headers: request.headers,
    payload: JSON.stringify(request.payload),
  });

  return {
    statusCode: response.statusCode,
    body: response.json<unknown>(),
  };
};

try {
  const accepted = await deliverPosOrderPaidFixtureToEvents(posOrderPaidFixture("accepted"), {
    bearerToken: authorizedToken,
    transport,
  });
  const duplicate = await deliverPosOrderPaidFixtureToEvents(posOrderPaidFixture("accepted"), {
    bearerToken: authorizedToken,
    transport,
  });
  const unauthorized = await deliverPosOrderPaidFixtureToEvents(posOrderPaidFixture("unauthorized"), {
    bearerToken: invalidToken,
    transport,
  });
  const invalid = await sendDataDynaEventToEvents(
    {
      source: "pos",
      invalidFixture: true,
    },
    {
      bearerToken: authorizedToken,
      transport,
    },
  );
  const tenantMismatch = await deliverPosOrderPaidFixtureToEvents(posOrderPaidFixture("tenant-mismatch", {
    merchantId: "merchant-pos-producer-probe-other",
    storeId: "store-pos-producer-probe-other",
  }), {
    bearerToken: authorizedToken,
    transport,
  });
  const deliveryFailure = await deliverPosOrderPaidFixtureToEvents(posOrderPaidFixture("timeout"), {
    bearerToken: authorizedToken,
    timeoutMs: 1,
    transport: async () => new Promise<never>(() => undefined),
  });

  assert.equal(accepted.outcome, "sent");
  assert.equal(duplicate.outcome, "duplicate");
  assert.equal(unauthorized.outcome, "unauthorized");
  assert.equal(invalid.outcome, "invalid_payload");
  assert.equal(tenantMismatch.outcome, "tenant_mismatch");
  assert.equal(deliveryFailure.outcome, "transient_send_failure");
  assert.equal([accepted, duplicate, unauthorized, invalid, tenantMismatch, deliveryFailure].every((result) => !result.primaryFlowBlocked), true);

  const summary = {
    service: "data-dyna",
    runtimeEnvironment: "test",
    deliveryResults: countDeliveryOutcomes([
      accepted.outcome,
      duplicate.outcome,
      unauthorized.outcome,
      invalid.outcome,
      tenantMismatch.outcome,
      deliveryFailure.outcome,
    ]),
    rawEventEvidence: {
      acceptedRows: store.accepted().length,
      acceptedByType: countAcceptedTypes(store.accepted()),
      invalidRows: store.invalid().length,
      invalidReasonCodes: countInvalidReasonCodes(store.invalid()),
      unauthorizedPersistenceSideEffects: 0,
    },
    logEvents: countLogEvents(),
    metricCounters: {
      httpRequests: {
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
        unauthorized: metricSum("data_dyna_http_requests_total", {
          route: "/events",
          method: "POST",
          status_class: "4xx",
          outcome: "unauthorized",
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
        source: "pos",
        producer_service: "pos-lite-cashier",
        producer_environment: "test",
      }),
      durationObservations: metricSink.records.filter((record) => record.name === "data_dyna_http_request_duration_ms")
        .length,
    },
    replayBackfillHandoff: {
      duplicateReplayRowsCreated: store.accepted().length - 1,
      retryOrBackfillDeliveryFailures: deliveryFailure.retryAdvice === "retry_or_backfill" ? 1 : 0,
      p5DurableWorkerImplementationClaimed: false,
    },
  };

  assert.deepEqual(summary.deliveryResults, {
    sent: 1,
    duplicate: 1,
    unauthorized: 1,
    invalid_payload: 1,
    tenant_mismatch: 1,
    transient_send_failure: 1,
  });
  assert.deepEqual(summary.rawEventEvidence, {
    acceptedRows: 1,
    acceptedByType: {
      "pos/transaction_scene/pos.order_paid": 1,
    },
    invalidRows: 2,
    invalidReasonCodes: {
      invalid_schema: 1,
      TENANT_MISMATCH: 1,
    },
    unauthorizedPersistenceSideEffects: 0,
  });
  assert.deepEqual(summary.logEvents, {
    "ingestion.event.accepted": 1,
    "runtime.request.completed": 5,
    "ingestion.event.duplicate": 1,
    "ingestion.auth.rejected": 1,
    "ingestion.event.invalid": 1,
    "ingestion.event.tenant_policy_rejected": 1,
  });
  assert.equal(summary.metricCounters.httpRequests.accepted, 1);
  assert.equal(summary.metricCounters.httpRequests.duplicate, 1);
  assert.equal(summary.metricCounters.httpRequests.unauthorized, 1);
  assert.equal(summary.metricCounters.httpRequests.invalid, 1);
  assert.equal(summary.metricCounters.httpRequests.tenantMismatch, 1);
  assert.equal(summary.metricCounters.authRejections, 1);
  assert.equal(summary.metricCounters.ingestionEvents.accepted, 1);
  assert.equal(summary.metricCounters.ingestionEvents.duplicate, 1);
  assert.equal(summary.metricCounters.ingestionEvents.invalid, 1);
  assert.equal(summary.metricCounters.ingestionEvents.tenantMismatch, 1);
  assert.equal(summary.metricCounters.tenantPolicyFailures, 1);
  assert.equal(summary.metricCounters.durationObservations, 5);
  assert.deepEqual(summary.replayBackfillHandoff, {
    duplicateReplayRowsCreated: 0,
    retryOrBackfillDeliveryFailures: 1,
    p5DurableWorkerImplementationClaimed: false,
  });

  assertNoForbiddenOutput(JSON.stringify([...logSink.records, ...metricSink.records]), [
    authorizedToken,
    invalidToken,
    `${runId}:idempotency:accepted`,
    `${runId}:idempotency:unauthorized`,
    `${runId}:idempotency:tenant-mismatch`,
    `${runId}:idempotency:timeout`,
    `${runId}:payment:accepted`,
    "DATA_DYNA_INGESTION_CREDENTIALS_JSON",
    "Authorization",
  ]);
  assertNoForbiddenOutput(JSON.stringify(summary), [
    runId,
    authorizedToken,
    invalidToken,
    ingestionCredential.credentialId,
    ingestionCredential.merchantId,
    ingestionCredential.storeIds[0],
    "idempotency",
    "payment:",
    "order:",
    "DATA_DYNA_INGESTION_CREDENTIALS_JSON",
    "Authorization",
  ]);

  console.log("POS producer delivery probe passed:");
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await app.close();
}

function posOrderPaidFixture(
  suffix: string,
  overrides: { merchantId?: string; storeId?: string } = {},
): Record<string, unknown> {
  return {
    schemaVersion: "pos.order-paid.v1",
    source: "pos",
    merchantId: overrides.merchantId ?? ingestionCredential.merchantId,
    storeId: overrides.storeId ?? ingestionCredential.storeIds[0],
    brandId: "brand-pos-producer-probe",
    orderId: `${runId}:order:${suffix}`,
    paymentId: `${runId}:payment:${suffix}`,
    orderVersion: "paid-1",
    paidAt: "2026-05-03T12:00:00.000Z",
    emittedAt: "2026-05-03T12:00:01.000Z",
    producer: {
      service: "pos-lite-cashier",
      app: "pos-register",
      environment: "test",
    },
    cashierActorType: "cashier",
    orderChannel: "in_store_pos",
    paymentStatus: "paid",
    paymentMethodType: "card_present",
    currency: "CNY",
    lineItemCount: 2,
  };
}

function countDeliveryOutcomes(outcomes: string[]): Record<string, number> {
  return outcomes.reduce((counts, outcome) => ({
    ...counts,
    [outcome]: (counts[outcome] ?? 0) + 1,
  }), {} as Record<string, number>);
}

function countAcceptedTypes(records: RawEventRecord[]): Record<string, number> {
  return records.reduce((counts, record) => {
    const key = `${record.source}/${record.domain}/${record.name}`;
    return {
      ...counts,
      [key]: (counts[key] ?? 0) + 1,
    };
  }, {} as Record<string, number>);
}

function countInvalidReasonCodes(records: InvalidRawEventRecord[]): Record<string, number> {
  return records.reduce((counts, record) => {
    const key = record.reasonCode ?? "invalid_schema";
    return {
      ...counts,
      [key]: (counts[key] ?? 0) + 1,
    };
  }, {} as Record<string, number>);
}

function countLogEvents(): Record<RuntimeLogEvent, number> {
  return logSink.records.reduce((counts, record) => ({
    ...counts,
    [record.event]: (counts[record.event] ?? 0) + 1,
  }), {} as Record<RuntimeLogEvent, number>);
}

function metricSum(name: RuntimeMetricName, labels: RuntimeMetricLabels): number {
  return metricSink.sum(name, labels);
}

function assertNoForbiddenOutput(output: string, forbiddenValues: string[]): void {
  for (const value of forbiddenValues) {
    assert.equal(output.includes(value), false, `POS producer delivery probe output leaked ${value}`);
  }
}
