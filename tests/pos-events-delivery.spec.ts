import assert from "node:assert/strict";
import { buildDataDynaApp } from "../src/app/app.ts";
import { loadRuntimeConfig } from "../src/app/config/runtime-config.ts";
import { InMemoryRuntimeLogSink, type RuntimeLogEvent } from "../src/app/observability/runtime-log.ts";
import { InMemoryRuntimeMetricSink } from "../src/app/observability/runtime-metrics.ts";
import {
  POS_EVENTS_DELIVERY_TIMEOUT_MS,
  deliverPosOrderPaidFixtureToEvents,
  sendDataDynaEventToEvents,
  type PosEventsDeliveryResult,
  type PosEventsDeliveryTransport,
  type PosEventsDeliveryTransportRequest,
} from "../src/app/producers/pos-events-delivery.ts";
import { InMemoryRawEventStore } from "../src/ingestion/raw-event-store.ts";

const runId = `pos-delivery-${Date.now()}`;
const authorizedToken = "<local-placeholder-token-pos-delivery>";
const invalidToken = "<invalid-placeholder-token-pos-delivery>";
const ingestionCredential = {
  credentialId: "local-pos-delivery",
  token: authorizedToken,
  merchantId: "merchant-local-a",
  storeIds: ["store-local-a"],
  producer: {
    service: "pos-lite-cashier",
    environment: "test",
  },
  source: "pos",
};
const validFixture = posOrderPaidFixture({ orderId: `${runId}:order:accepted`, paymentId: `${runId}:payment:accepted` });

const store = new InMemoryRawEventStore();
const logSink = new InMemoryRuntimeLogSink();
const metricSink = new InMemoryRuntimeMetricSink();
const observedRequests: PosEventsDeliveryTransportRequest[] = [];
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
  observedRequests.push(request);
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
  const accepted = await deliverPosOrderPaidFixtureToEvents(validFixture, {
    bearerToken: authorizedToken,
    transport,
  });
  assertDelivery(accepted, true, "sent", 202, "none");
  assert.equal(observedRequests[0]?.path, "/events");
  assert.equal(observedRequests[0]?.headers.authorization, `Bearer ${authorizedToken}`);
  assert.equal(observedRequests[0]?.headers["content-type"], "application/json");
  assert.equal(observedRequests[0]?.timeoutMs, POS_EVENTS_DELIVERY_TIMEOUT_MS);
  assert.equal((observedRequests[0]?.payload as { source?: string }).source, "pos");
  assert.equal(store.accepted().length, 1);
  assert.equal(store.accepted()[0]?.credentialId, ingestionCredential.credentialId);
  assert.equal(store.accepted()[0]?.merchantId, ingestionCredential.merchantId);
  assert.equal(store.accepted()[0]?.storeId, ingestionCredential.storeIds[0]);
  assert.equal(store.invalid().length, 0);

  const duplicate = await deliverPosOrderPaidFixtureToEvents(validFixture, {
    bearerToken: authorizedToken,
    transport,
  });
  assertDelivery(duplicate, true, "duplicate", 202, "none");
  assert.equal(store.accepted().length, 1);
  assert.equal(store.invalid().length, 0);

  const unauthorized = await deliverPosOrderPaidFixtureToEvents(
    posOrderPaidFixture({ orderId: `${runId}:order:unauthorized`, paymentId: `${runId}:payment:unauthorized` }),
    {
      bearerToken: invalidToken,
      transport,
    },
  );
  assertDelivery(unauthorized, false, "unauthorized", 401, "fix_credentials");
  assert.equal(store.accepted().length, 1);
  assert.equal(store.invalid().length, 0);

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
  assertDelivery(invalid, false, "invalid_payload", 400, "fix_payload_contract");
  assert.equal(store.accepted().length, 1);
  assert.equal(store.invalid().length, 1);

  const malformedFixture = await deliverPosOrderPaidFixtureToEvents(
    { ...validFixture, orderId: "" },
    {
      bearerToken: authorizedToken,
      transport,
    },
  );
  assertDelivery(malformedFixture, false, "invalid_payload", undefined, "fix_payload_contract");
  assert.equal(store.accepted().length, 1);
  assert.equal(store.invalid().length, 1);

  const tenantMismatch = await deliverPosOrderPaidFixtureToEvents(
    posOrderPaidFixture({
      orderId: `${runId}:order:tenant-mismatch`,
      paymentId: `${runId}:payment:tenant-mismatch`,
      merchantId: "merchant-local-b",
      storeId: "store-local-b",
    }),
    {
      bearerToken: authorizedToken,
      transport,
    },
  );
  assertDelivery(tenantMismatch, false, "tenant_mismatch", 403, "fix_tenant_mapping");
  assert.equal(store.accepted().length, 1);
  assert.equal(store.invalid().length, 2);
  assert.equal(store.invalid().at(-1)?.reasonCode, "TENANT_MISMATCH");

  const sourceMismatchPayload = {
    ...(observedRequests[0]?.payload as Record<string, unknown>),
    source: "mini_program",
    correlation: {
      eventId: `${runId}:event:source-mismatch`,
    },
    idempotency: {
      scope: "store",
      key: `${runId}:idempotency:source-mismatch`,
    },
  };
  const sourceMismatch = await sendDataDynaEventToEvents(sourceMismatchPayload, {
    bearerToken: authorizedToken,
    transport,
  });
  assertDelivery(sourceMismatch, false, "tenant_mismatch", 403, "fix_tenant_mapping");
  assert.equal(store.accepted().length, 1);
  assert.equal(store.invalid().length, 3);
  assert.equal(store.invalid().at(-1)?.reasonCode, "TENANT_MISMATCH");

  const transient = await deliverPosOrderPaidFixtureToEvents(
    posOrderPaidFixture({ orderId: `${runId}:order:transient`, paymentId: `${runId}:payment:transient` }),
    {
      bearerToken: authorizedToken,
      transport: async () => {
        throw new Error("simulated Data Dyna transport failure");
      },
    },
  );
  assertDelivery(transient, false, "transient_send_failure", undefined, "retry_or_backfill");
  assert.equal(store.accepted().length, 1);
  assert.equal(store.invalid().length, 3);

  const timeout = await deliverPosOrderPaidFixtureToEvents(
    posOrderPaidFixture({ orderId: `${runId}:order:timeout`, paymentId: `${runId}:payment:timeout` }),
    {
      bearerToken: authorizedToken,
      timeoutMs: 1,
      transport: async () => new Promise<never>(() => undefined),
    },
  );
  assertDelivery(timeout, false, "transient_send_failure", undefined, "retry_or_backfill");
  assert.equal(store.accepted().length, 1);
  assert.equal(store.invalid().length, 3);

  assert.equal(
    [accepted, duplicate, unauthorized, invalid, malformedFixture, tenantMismatch, sourceMismatch, transient, timeout].every(
      (result) => !result.primaryFlowBlocked,
    ),
    true,
  );
  assertRuntimeLog("ingestion.event.accepted");
  assertRuntimeLog("ingestion.event.duplicate");
  assertRuntimeLog("ingestion.auth.rejected");
  assertRuntimeLog("ingestion.event.invalid");
  assertRuntimeLog("ingestion.event.tenant_policy_rejected");
  assert.equal(
    metricSink.sum("data_dyna_ingestion_auth_rejections_total", {
      route: "/events",
      method: "POST",
      error_code: "UNAUTHORIZED",
    }),
    1,
  );
  assert.equal(
    metricSink.sum("data_dyna_ingestion_events_total", {
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
    metricSink.sum("data_dyna_ingestion_events_total", {
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
    metricSink.sum("data_dyna_ingestion_events_total", {
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
    metricSink.sum("data_dyna_ingestion_events_total", {
      route: "/events",
      outcome: "tenant_mismatch",
      error_code: "TENANT_MISMATCH",
      source: "pos",
      producer_service: "pos-lite-cashier",
      producer_environment: "test",
    }),
    2,
  );
  assert.equal(
    metricSink.sum("data_dyna_ingestion_tenant_policy_failures_total", {
      error_code: "TENANT_MISMATCH",
      source: "pos",
      producer_service: "pos-lite-cashier",
      producer_environment: "test",
    }),
    2,
  );
  assert.equal(
    JSON.stringify([
      accepted,
      duplicate,
      unauthorized,
      invalid,
      malformedFixture,
      tenantMismatch,
      sourceMismatch,
      transient,
      timeout,
    ]).includes(authorizedToken),
    false,
  );
  assert.equal(
    JSON.stringify([
      accepted,
      duplicate,
      unauthorized,
      invalid,
      malformedFixture,
      tenantMismatch,
      sourceMismatch,
      transient,
      timeout,
    ]).includes(invalidToken),
    false,
  );
} finally {
  await app.close();
}

function posOrderPaidFixture(options: {
  orderId: string;
  paymentId: string;
  merchantId?: string;
  storeId?: string;
}): Record<string, unknown> {
  return {
    schemaVersion: "pos.order-paid.v1",
    source: "pos",
    merchantId: options.merchantId ?? ingestionCredential.merchantId,
    storeId: options.storeId ?? ingestionCredential.storeIds[0],
    brandId: "brand-local-a",
    orderId: options.orderId,
    paymentId: options.paymentId,
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

function assertDelivery(
  result: PosEventsDeliveryResult,
  ok: boolean,
  outcome: PosEventsDeliveryResult["outcome"],
  statusCode: number | undefined,
  retryAdvice: PosEventsDeliveryResult["retryAdvice"],
): void {
  assert.equal(result.ok, ok);
  assert.equal(result.outcome, outcome);
  assert.equal(result.statusCode, statusCode);
  assert.equal(result.retryAdvice, retryAdvice);
  assert.equal(result.primaryFlowBlocked, false);
}

function assertRuntimeLog(event: RuntimeLogEvent): void {
  assert.ok(logSink.records.some((record) => record.event === event), `expected runtime log ${event}`);
}
