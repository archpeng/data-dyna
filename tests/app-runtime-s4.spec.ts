import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { loadPostgresTestConfig } from "../src/app/config/postgres-test-config.ts";
import { loadRuntimeConfig } from "../src/app/config/runtime-config.ts";
import { type PostgresRawEventClient } from "../src/app/repositories/postgres-raw-event-repository.ts";
import { buildDataDynaRuntimeServer } from "../src/app/runtime-server.ts";
import type { DataDynaEvent } from "../src/contracts/event-contract.ts";

const require = createRequire(import.meta.url);

type PgClient = PostgresRawEventClient & {
  connect(): Promise<void>;
  end(): Promise<void>;
};

type InjectResponse = {
  statusCode: number;
  headers: Record<string, number | string | string[] | undefined>;
  json<T>(): T;
};

type EventResponseBody = {
  ok: boolean;
  status: number;
  error?: {
    code: string;
    message: string;
  };
  duplicate?: boolean;
  persisted?: {
    eventId: string;
    idempotencyKey: string;
    credentialId?: string;
    merchantId?: string;
    storeId?: string;
    producerEnvironment?: string;
  };
  invalid?: {
    reason: string;
    payload: unknown;
    credentialId?: string;
    merchantId?: string;
    storeId?: string;
    producerService?: string;
    producerEnvironment?: string;
    source?: string;
    reasonCode?: string;
  };
  results?: EventResponseBody[];
};

const { Client } = require("pg") as {
  Client: new (options: { connectionString: string; application_name: string }) => PgClient;
};

const runId = `runtime-s4-${Date.now()}`;
const idempotencyKey = `${runId}:event:idempotency`;
const firstEventId = `${runId}:event:first`;
const duplicateEventId = `${runId}:event:duplicate-attempt`;
const crossTenantAcceptedEventId = `${runId}:event:tenant-b-same-key`;
const tenantMismatchIdempotencyKey = `${runId}:event:tenant-mismatch:idempotency`;
const tenantMismatchEventId = `${runId}:event:tenant-mismatch`;
const missingMerchantIdempotencyKey = `${runId}:event:missing-merchant:idempotency`;
const missingMerchantEventId = `${runId}:event:missing-merchant`;
const missingStoreIdempotencyKey = `${runId}:event:missing-store:idempotency`;
const missingStoreEventId = `${runId}:event:missing-store`;
const missingEnvironmentIdempotencyKey = `${runId}:event:missing-environment:idempotency`;
const missingEnvironmentEventId = `${runId}:event:missing-environment`;
const reservedScopeIdempotencyKey = `${runId}:event:reserved-scope:idempotency`;
const reservedScopeEventId = `${runId}:event:reserved-scope`;
const malformedMerchantIdempotencyKey = `${runId}:event:malformed-merchant:idempotency`;
const malformedMerchantEventId = `${runId}:event:malformed-merchant`;
const batchIdempotencyKey = `${runId}:batch:idempotency`;
const batchEventId = `${runId}:batch:event`;
const batchTenantMismatchIdempotencyKey = `${runId}:batch:tenant-mismatch:idempotency`;
const batchTenantMismatchEventId = `${runId}:batch:tenant-mismatch`;
const batchMissingStoreIdempotencyKey = `${runId}:batch:missing-store:idempotency`;
const batchMissingStoreEventId = `${runId}:batch:missing-store`;
const allIdempotencyKeys = [
  idempotencyKey,
  tenantMismatchIdempotencyKey,
  missingMerchantIdempotencyKey,
  missingStoreIdempotencyKey,
  missingEnvironmentIdempotencyKey,
  reservedScopeIdempotencyKey,
  malformedMerchantIdempotencyKey,
  batchIdempotencyKey,
  batchTenantMismatchIdempotencyKey,
  batchMissingStoreIdempotencyKey,
];
const allEventIds = [
  firstEventId,
  duplicateEventId,
  crossTenantAcceptedEventId,
  tenantMismatchEventId,
  missingMerchantEventId,
  missingStoreEventId,
  missingEnvironmentEventId,
  reservedScopeEventId,
  malformedMerchantEventId,
  batchEventId,
  batchTenantMismatchEventId,
  batchMissingStoreEventId,
];
const authorizedToken = "<local-placeholder-token-a>";
const crossTenantAuthorizedToken = "<local-placeholder-token-b>";
const authorizedHeaders = { authorization: `Bearer ${authorizedToken}` };
const crossTenantAuthorizedHeaders = { authorization: `Bearer ${crossTenantAuthorizedToken}` };
const ingestionCredential = {
  credentialId: "local-pos-store-a",
  token: authorizedToken,
  merchantId: "merchant-runtime-s4",
  storeIds: ["store-runtime-s4"],
  producer: {
    service: "pos-lite-cashier",
    environment: "test",
  },
  source: "pos",
};
const crossTenantIngestionCredential = {
  credentialId: "local-pos-store-b",
  token: crossTenantAuthorizedToken,
  merchantId: "merchant-runtime-s4-b",
  storeIds: ["store-runtime-s4-b"],
  producer: {
    service: "pos-lite-cashier",
    environment: "test",
  },
  source: "pos",
};

const databaseUrl = loadPostgresTestConfig().databaseUrl;
const client = new Client({
  connectionString: databaseUrl,
  application_name: "data-dyna-app-runtime-s4-spec",
});

await client.connect();

const app = buildDataDynaRuntimeServer({
  config: loadRuntimeConfig({
    DATA_DYNA_RUNTIME_ENV: "test",
    DATA_DYNA_DATABASE_URL: databaseUrl,
    DATA_DYNA_INGESTION_CREDENTIALS_JSON: JSON.stringify([ingestionCredential, crossTenantIngestionCredential]),
  }),
  logger: false,
});

try {
  await cleanFixtures(client);
  assert.equal(await rawEventCount(client, allIdempotencyKeys), 0);
  assert.equal(await invalidEventCount(client), 0);

  const missingEventCredentialResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify(validEvent({ eventId: firstEventId, idempotencyKey })),
  });
  assertUnauthorized(missingEventCredentialResponse);
  assert.equal(await rawEventCount(client, [idempotencyKey, batchIdempotencyKey]), 0);
  assert.equal(await invalidEventCount(client), 0);

  const invalidEventCredentialResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json", authorization: "Bearer <invalid-placeholder-token>" },
    payload: JSON.stringify(validEvent({ eventId: firstEventId, idempotencyKey })),
  });
  assertUnauthorized(invalidEventCredentialResponse);
  assert.equal(await rawEventCount(client, [idempotencyKey, batchIdempotencyKey]), 0);
  assert.equal(await invalidEventCount(client), 0);

  const nonBearerEventCredentialResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json", authorization: `Basic ${authorizedToken}` },
    payload: JSON.stringify(validEvent({ eventId: firstEventId, idempotencyKey })),
  });
  assertUnauthorized(nonBearerEventCredentialResponse);
  assert.equal(await rawEventCount(client, [idempotencyKey, batchIdempotencyKey]), 0);
  assert.equal(await invalidEventCount(client), 0);

  const missingBatchCredentialResponse = await app.inject({
    method: "POST",
    url: "/events/batch",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify([validEvent({ eventId: batchEventId, idempotencyKey: batchIdempotencyKey })]),
  });
  assertUnauthorized(missingBatchCredentialResponse);
  assert.equal(await rawEventCount(client, [idempotencyKey, batchIdempotencyKey]), 0);
  assert.equal(await invalidEventCount(client), 0);

  const invalidBatchCredentialResponse = await app.inject({
    method: "POST",
    url: "/events/batch",
    headers: { "content-type": "application/json", authorization: "Bearer <invalid-placeholder-token>" },
    payload: JSON.stringify([validEvent({ eventId: batchEventId, idempotencyKey: batchIdempotencyKey })]),
  });
  assertUnauthorized(invalidBatchCredentialResponse);
  assert.equal(await rawEventCount(client, [idempotencyKey, batchIdempotencyKey]), 0);
  assert.equal(await invalidEventCount(client), 0);

  const emptyBearerBatchCredentialResponse = await app.inject({
    method: "POST",
    url: "/events/batch",
    headers: { "content-type": "application/json", authorization: "Bearer " },
    payload: JSON.stringify([validEvent({ eventId: batchEventId, idempotencyKey: batchIdempotencyKey })]),
  });
  assertUnauthorized(emptyBearerBatchCredentialResponse);
  assert.equal(await rawEventCount(client, [idempotencyKey, batchIdempotencyKey]), 0);
  assert.equal(await invalidEventCount(client), 0);

  const tenantMismatchResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json", ...authorizedHeaders },
    payload: JSON.stringify(
      validEvent({
        eventId: tenantMismatchEventId,
        idempotencyKey: tenantMismatchIdempotencyKey,
        merchantId: "merchant-runtime-s4-b",
        storeId: "store-runtime-s4-b",
      }),
    ),
  });
  assertTenantPolicyFailure(tenantMismatchResponse, 403, "TENANT_MISMATCH");
  assert.equal(await rawEventCount(client, allIdempotencyKeys), 0);
  assert.equal(await invalidReasonCodeCount(client, "TENANT_MISMATCH"), 1);

  const missingMerchantPayload = validEvent({
    eventId: missingMerchantEventId,
    idempotencyKey: missingMerchantIdempotencyKey,
  });
  delete missingMerchantPayload.identity.merchantId;
  const missingMerchantResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json", ...authorizedHeaders },
    payload: JSON.stringify(missingMerchantPayload),
  });
  assertTenantPolicyFailure(missingMerchantResponse, 400, "TENANT_IDENTITY_REQUIRED");
  assert.equal(await rawEventCount(client, allIdempotencyKeys), 0);

  const missingStorePayload = validEvent({
    eventId: missingStoreEventId,
    idempotencyKey: missingStoreIdempotencyKey,
  });
  delete missingStorePayload.identity.storeId;
  const missingStoreResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json", ...authorizedHeaders },
    payload: JSON.stringify(missingStorePayload),
  });
  assertTenantPolicyFailure(missingStoreResponse, 400, "TENANT_IDENTITY_REQUIRED");
  assert.equal(await rawEventCount(client, allIdempotencyKeys), 0);

  const missingEnvironmentPayload = validEvent({
    eventId: missingEnvironmentEventId,
    idempotencyKey: missingEnvironmentIdempotencyKey,
  });
  delete missingEnvironmentPayload.producer.environment;
  const missingEnvironmentResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json", ...authorizedHeaders },
    payload: JSON.stringify(missingEnvironmentPayload),
  });
  assertTenantPolicyFailure(missingEnvironmentResponse, 400, "TENANT_IDENTITY_REQUIRED");
  assert.equal(await rawEventCount(client, allIdempotencyKeys), 0);

  const reservedScopeResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json", ...authorizedHeaders },
    payload: JSON.stringify(
      validEvent({
        eventId: reservedScopeEventId,
        idempotencyKey: reservedScopeIdempotencyKey,
        idempotencyScope: "global",
      }),
    ),
  });
  assertTenantPolicyFailure(reservedScopeResponse, 400, "TENANT_IDENTITY_REQUIRED");
  assert.equal(await rawEventCount(client, allIdempotencyKeys), 0);
  assert.equal(await invalidReasonCodeCount(client, "TENANT_IDENTITY_REQUIRED"), 4);

  const malformedMerchantPayload = validEvent({
    eventId: malformedMerchantEventId,
    idempotencyKey: malformedMerchantIdempotencyKey,
  });
  malformedMerchantPayload.identity.merchantId = "";
  const malformedMerchantResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json", ...authorizedHeaders },
    payload: JSON.stringify(malformedMerchantPayload),
  });
  assert.equal(malformedMerchantResponse.statusCode, 400);
  const malformedMerchantBody = malformedMerchantResponse.json<EventResponseBody>();
  assert.equal(malformedMerchantBody.ok, false);
  assert.equal(malformedMerchantBody.status, 400);
  assert.equal(malformedMerchantBody.invalid?.credentialId, ingestionCredential.credentialId);
  assert.equal(await rawEventCount(client, allIdempotencyKeys), 0);

  const acceptedResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json", ...authorizedHeaders },
    payload: JSON.stringify(validEvent({ eventId: firstEventId, idempotencyKey })),
  });
  assert.equal(acceptedResponse.statusCode, 202);
  const acceptedBody = acceptedResponse.json<EventResponseBody>();
  assert.equal(acceptedBody.ok, true);
  assert.equal(acceptedBody.status, 202);
  assert.equal(acceptedBody.duplicate, false);
  assert.equal(acceptedBody.persisted?.eventId, firstEventId);
  assert.equal(acceptedBody.persisted?.idempotencyKey, idempotencyKey);
  assert.equal(acceptedBody.persisted?.credentialId, ingestionCredential.credentialId);
  assert.equal(acceptedBody.persisted?.merchantId, ingestionCredential.merchantId);
  assert.equal(acceptedBody.persisted?.storeId, ingestionCredential.storeIds[0]);
  assert.equal(acceptedBody.persisted?.producerEnvironment, ingestionCredential.producer.environment);
  assert.deepEqual(await rawEventTenantColumns(client, firstEventId), {
    credential_id: ingestionCredential.credentialId,
    merchant_id: ingestionCredential.merchantId,
    store_id: ingestionCredential.storeIds[0],
    producer_environment: ingestionCredential.producer.environment,
  });
  assert.equal(await rawEventCount(client, [idempotencyKey, batchIdempotencyKey]), 1);

  const duplicateResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json", ...authorizedHeaders },
    payload: JSON.stringify(validEvent({ eventId: duplicateEventId, idempotencyKey })),
  });
  assert.equal(duplicateResponse.statusCode, 202);
  const duplicateBody = duplicateResponse.json<EventResponseBody>();
  assert.equal(duplicateBody.ok, true);
  assert.equal(duplicateBody.status, 202);
  assert.equal(duplicateBody.duplicate, true);
  assert.equal(duplicateBody.persisted?.eventId, firstEventId);
  assert.equal(duplicateBody.persisted?.idempotencyKey, idempotencyKey);
  assert.equal(await rawEventCount(client, [idempotencyKey]), 1);

  const crossTenantAcceptedResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json", ...crossTenantAuthorizedHeaders },
    payload: JSON.stringify(
      validEvent({
        eventId: crossTenantAcceptedEventId,
        idempotencyKey,
        merchantId: crossTenantIngestionCredential.merchantId,
        storeId: crossTenantIngestionCredential.storeIds[0],
      }),
    ),
  });
  assert.equal(crossTenantAcceptedResponse.statusCode, 202);
  const crossTenantAcceptedBody = crossTenantAcceptedResponse.json<EventResponseBody>();
  assert.equal(crossTenantAcceptedBody.ok, true);
  assert.equal(crossTenantAcceptedBody.status, 202);
  assert.equal(crossTenantAcceptedBody.duplicate, false);
  assert.equal(crossTenantAcceptedBody.persisted?.eventId, crossTenantAcceptedEventId);
  assert.equal(crossTenantAcceptedBody.persisted?.idempotencyKey, idempotencyKey);
  assert.equal(crossTenantAcceptedBody.persisted?.credentialId, crossTenantIngestionCredential.credentialId);
  assert.equal(crossTenantAcceptedBody.persisted?.merchantId, crossTenantIngestionCredential.merchantId);
  assert.equal(crossTenantAcceptedBody.persisted?.storeId, crossTenantIngestionCredential.storeIds[0]);
  assert.deepEqual(await rawEventTenantColumns(client, crossTenantAcceptedEventId), {
    credential_id: crossTenantIngestionCredential.credentialId,
    merchant_id: crossTenantIngestionCredential.merchantId,
    store_id: crossTenantIngestionCredential.storeIds[0],
    producer_environment: crossTenantIngestionCredential.producer.environment,
  });
  assert.equal(await rawEventCount(client, [idempotencyKey]), 2);

  const invalidPayload = { testRunId: runId, invalidSingle: true };
  const invalidResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json", ...authorizedHeaders },
    payload: JSON.stringify(invalidPayload),
  });
  assert.equal(invalidResponse.statusCode, 400);
  const invalidBody = invalidResponse.json<EventResponseBody>();
  assert.equal(invalidBody.ok, false);
  assert.equal(invalidBody.status, 400);
  assert.deepEqual(invalidBody.invalid?.payload, invalidPayload);
  assert.match(invalidBody.invalid?.reason ?? "", /Invalid input/);

  const batchTenantMismatchPayload = validEvent({
    eventId: batchTenantMismatchEventId,
    idempotencyKey: batchTenantMismatchIdempotencyKey,
    merchantId: "merchant-runtime-s4-b",
    storeId: "store-runtime-s4-b",
  });
  const batchMissingStorePayload = validEvent({
    eventId: batchMissingStoreEventId,
    idempotencyKey: batchMissingStoreIdempotencyKey,
  });
  delete batchMissingStorePayload.identity.storeId;
  const batchResponse = await app.inject({
    method: "POST",
    url: "/events/batch",
    headers: { "content-type": "application/json", ...authorizedHeaders },
    payload: JSON.stringify([
      validEvent({ eventId: batchEventId, idempotencyKey: batchIdempotencyKey }),
      batchTenantMismatchPayload,
      batchMissingStorePayload,
    ]),
  });
  assert.equal(batchResponse.statusCode, 207);
  const batchBody = batchResponse.json<EventResponseBody>();
  assert.equal(batchBody.ok, false);
  assert.equal(batchBody.status, 207);
  assert.equal(batchBody.results?.length, 3);
  assert.equal(batchBody.results?.[0]?.ok, true);
  assert.equal(batchBody.results?.[0]?.status, 202);
  assert.equal(batchBody.results?.[0]?.duplicate, false);
  assert.equal(batchBody.results?.[0]?.persisted?.credentialId, ingestionCredential.credentialId);
  assert.equal(batchBody.results?.[1]?.ok, false);
  assert.equal(batchBody.results?.[1]?.status, 403);
  assert.equal(batchBody.results?.[1]?.error?.code, "TENANT_MISMATCH");
  assert.equal(batchBody.results?.[1]?.invalid?.reasonCode, "TENANT_MISMATCH");
  assert.equal(batchBody.results?.[2]?.ok, false);
  assert.equal(batchBody.results?.[2]?.status, 400);
  assert.equal(batchBody.results?.[2]?.error?.code, "TENANT_IDENTITY_REQUIRED");
  assert.equal(batchBody.results?.[2]?.invalid?.reasonCode, "TENANT_IDENTITY_REQUIRED");
  assert.equal(await rawEventCount(client, [batchIdempotencyKey, batchTenantMismatchIdempotencyKey, batchMissingStoreIdempotencyKey]), 1);

  const nonArrayBatchPayload = { testRunId: runId, notArrayBatch: true };
  const nonArrayBatchResponse = await app.inject({
    method: "POST",
    url: "/events/batch",
    headers: { "content-type": "application/json", ...authorizedHeaders },
    payload: JSON.stringify(nonArrayBatchPayload),
  });
  assert.equal(nonArrayBatchResponse.statusCode, 400);
  const nonArrayBatchBody = nonArrayBatchResponse.json<EventResponseBody>();
  assert.equal(nonArrayBatchBody.ok, false);
  assert.equal(nonArrayBatchBody.status, 400);
  assert.equal(nonArrayBatchBody.invalid?.reason, "Batch payload must be an array");
  assert.deepEqual(nonArrayBatchBody.invalid?.payload, nonArrayBatchPayload);

  assert.equal(await invalidEventCount(client), 10);
} finally {
  await app.close();
  await cleanFixtures(client).catch(() => undefined);
  await client.end();
}

function assertUnauthorized(response: InjectResponse): void {
  assert.equal(response.statusCode, 401);
  assert.equal(response.headers["www-authenticate"], "Bearer");
  const body = response.json<EventResponseBody>();
  assert.equal(body.ok, false);
  assert.equal(body.status, 401);
  assert.equal(body.error?.code, "UNAUTHORIZED");
  assert.equal(body.error?.message, "Unauthorized");
}

function assertTenantPolicyFailure(
  response: InjectResponse,
  statusCode: 400 | 403,
  errorCode: "TENANT_IDENTITY_REQUIRED" | "TENANT_MISMATCH",
): void {
  assert.equal(response.statusCode, statusCode);
  const body = response.json<EventResponseBody>();
  assert.equal(body.ok, false);
  assert.equal(body.status, statusCode);
  assert.equal(body.error?.code, errorCode);
  assert.equal(body.invalid?.reasonCode, errorCode);
  assert.equal(body.invalid?.credentialId, ingestionCredential.credentialId);
}

function validEvent(options: {
  eventId: string;
  idempotencyKey: string;
  merchantId?: string;
  storeId?: string;
  idempotencyScope?: DataDynaEvent["idempotency"]["scope"];
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
      brandId: "brand-runtime-s4",
      merchantId: options.merchantId ?? "merchant-runtime-s4",
      storeId: options.storeId ?? "store-runtime-s4",
      memberId: `${runId}:member`,
      actorType: "cashier",
    },
    correlation: {
      eventId: options.eventId,
      traceId: `${runId}:trace`,
    },
    entity: {
      type: "order",
      id: `${runId}:order`,
    },
    properties: {
      amount: 42.5,
      paymentMethod: "cash",
      testRunId: runId,
    },
    idempotency: {
      key: options.idempotencyKey,
      scope: options.idempotencyScope ?? "store",
    },
  };
}

async function cleanFixtures(clientToClean: PgClient): Promise<void> {
  await clientToClean.query("DELETE FROM raw_events WHERE idempotency_key = ANY($1::text[]) OR event_id = ANY($2::text[])", [
    allIdempotencyKeys,
    allEventIds,
  ]);
  await clientToClean.query(
    "DELETE FROM invalid_raw_events WHERE payload @> $1::jsonb OR payload @> $2::jsonb",
    [JSON.stringify({ testRunId: runId }), JSON.stringify({ properties: { testRunId: runId } })],
  );
}

async function rawEventCount(clientToQuery: PgClient, idempotencyKeys: string[]): Promise<number> {
  const result = await clientToQuery.query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM raw_events WHERE idempotency_key = ANY($1::text[])",
    [idempotencyKeys],
  );
  const count = result.rows[0]?.count;
  assert.equal(typeof count, "number");
  return count;
}

async function rawEventTenantColumns(
  clientToQuery: PgClient,
  eventId: string,
): Promise<{
  credential_id: string;
  merchant_id: string;
  store_id: string;
  producer_environment: string;
}> {
  const result = await clientToQuery.query<{
    credential_id: string;
    merchant_id: string;
    store_id: string;
    producer_environment: string;
  }>(
    `SELECT credential_id, merchant_id, store_id, producer_environment
       FROM raw_events
      WHERE event_id = $1`,
    [eventId],
  );
  const row = result.rows[0];
  assert.ok(row);
  return row;
}

async function invalidReasonCodeCount(clientToQuery: PgClient, reasonCode: string): Promise<number> {
  const result = await clientToQuery.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
       FROM invalid_raw_events
      WHERE reason_code = $1
        AND (payload @> $2::jsonb OR payload @> $3::jsonb)`,
    [reasonCode, JSON.stringify({ testRunId: runId }), JSON.stringify({ properties: { testRunId: runId } })],
  );
  const count = result.rows[0]?.count;
  assert.equal(typeof count, "number");
  return count;
}

async function invalidEventCount(clientToQuery: PgClient): Promise<number> {
  const result = await clientToQuery.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
       FROM invalid_raw_events
      WHERE payload @> $1::jsonb OR payload @> $2::jsonb`,
    [JSON.stringify({ testRunId: runId }), JSON.stringify({ properties: { testRunId: runId } })],
  );
  const count = result.rows[0]?.count;
  assert.equal(typeof count, "number");
  return count;
}
