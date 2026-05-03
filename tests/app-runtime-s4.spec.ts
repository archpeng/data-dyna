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

type EventResponseBody = {
  ok: boolean;
  status: number;
  duplicate?: boolean;
  persisted?: {
    eventId: string;
    idempotencyKey: string;
  };
  invalid?: {
    reason: string;
    payload: unknown;
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
const batchIdempotencyKey = `${runId}:batch:idempotency`;
const batchEventId = `${runId}:batch:event`;

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
  }),
  logger: false,
});

try {
  await cleanFixtures(client);
  assert.equal(await rawEventCount(client, [idempotencyKey, batchIdempotencyKey]), 0);
  assert.equal(await invalidEventCount(client), 0);

  const acceptedResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify(validEvent({ eventId: firstEventId, idempotencyKey })),
  });
  assert.equal(acceptedResponse.statusCode, 202);
  const acceptedBody = acceptedResponse.json<EventResponseBody>();
  assert.equal(acceptedBody.ok, true);
  assert.equal(acceptedBody.status, 202);
  assert.equal(acceptedBody.duplicate, false);
  assert.equal(acceptedBody.persisted?.eventId, firstEventId);
  assert.equal(acceptedBody.persisted?.idempotencyKey, idempotencyKey);
  assert.equal(await rawEventCount(client, [idempotencyKey, batchIdempotencyKey]), 1);

  const duplicateResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json" },
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

  const invalidPayload = { testRunId: runId, invalidSingle: true };
  const invalidResponse = await app.inject({
    method: "POST",
    url: "/events",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify(invalidPayload),
  });
  assert.equal(invalidResponse.statusCode, 400);
  const invalidBody = invalidResponse.json<EventResponseBody>();
  assert.equal(invalidBody.ok, false);
  assert.equal(invalidBody.status, 400);
  assert.deepEqual(invalidBody.invalid?.payload, invalidPayload);
  assert.match(invalidBody.invalid?.reason ?? "", /Invalid input/);

  const batchInvalidPayload = { testRunId: runId, invalidBatchMember: true };
  const batchResponse = await app.inject({
    method: "POST",
    url: "/events/batch",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify([
      validEvent({ eventId: batchEventId, idempotencyKey: batchIdempotencyKey }),
      batchInvalidPayload,
    ]),
  });
  assert.equal(batchResponse.statusCode, 207);
  const batchBody = batchResponse.json<EventResponseBody>();
  assert.equal(batchBody.ok, false);
  assert.equal(batchBody.status, 207);
  assert.equal(batchBody.results?.length, 2);
  assert.equal(batchBody.results?.[0]?.ok, true);
  assert.equal(batchBody.results?.[0]?.status, 202);
  assert.equal(batchBody.results?.[0]?.duplicate, false);
  assert.equal(batchBody.results?.[1]?.ok, false);
  assert.equal(batchBody.results?.[1]?.status, 400);
  assert.deepEqual(batchBody.results?.[1]?.invalid?.payload, batchInvalidPayload);
  assert.equal(await rawEventCount(client, [idempotencyKey, batchIdempotencyKey]), 2);

  const nonArrayBatchPayload = { testRunId: runId, notArrayBatch: true };
  const nonArrayBatchResponse = await app.inject({
    method: "POST",
    url: "/events/batch",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify(nonArrayBatchPayload),
  });
  assert.equal(nonArrayBatchResponse.statusCode, 400);
  const nonArrayBatchBody = nonArrayBatchResponse.json<EventResponseBody>();
  assert.equal(nonArrayBatchBody.ok, false);
  assert.equal(nonArrayBatchBody.status, 400);
  assert.equal(nonArrayBatchBody.invalid?.reason, "Batch payload must be an array");
  assert.deepEqual(nonArrayBatchBody.invalid?.payload, nonArrayBatchPayload);

  assert.equal(await invalidEventCount(client), 3);
} finally {
  await app.close();
  await cleanFixtures(client).catch(() => undefined);
  await client.end();
}

function validEvent(options: { eventId: string; idempotencyKey: string }): DataDynaEvent {
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
      storeId: "store-runtime-s4",
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
    },
    idempotency: {
      key: options.idempotencyKey,
      scope: "store",
    },
  };
}

async function cleanFixtures(clientToClean: PgClient): Promise<void> {
  await clientToClean.query("DELETE FROM raw_events WHERE idempotency_key = ANY($1::text[]) OR event_id = ANY($2::text[])", [
    [idempotencyKey, batchIdempotencyKey],
    [firstEventId, duplicateEventId, batchEventId],
  ]);
  await clientToClean.query("DELETE FROM invalid_raw_events WHERE payload @> $1::jsonb", [
    JSON.stringify({ testRunId: runId }),
  ]);
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

async function invalidEventCount(clientToQuery: PgClient): Promise<number> {
  const result = await clientToQuery.query<{ count: number }>(
    "SELECT COUNT(*)::int AS count FROM invalid_raw_events WHERE payload @> $1::jsonb",
    [JSON.stringify({ testRunId: runId })],
  );
  const count = result.rows[0]?.count;
  assert.equal(typeof count, "number");
  return count;
}
