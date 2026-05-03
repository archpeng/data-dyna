import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { loadPostgresTestConfig } from "../src/app/config/postgres-test-config.ts";
import {
  PostgresRawEventRepository,
  type PostgresRawEventClient,
} from "../src/app/repositories/postgres-raw-event-repository.ts";
import type { DataDynaEvent } from "../src/contracts/event-contract.ts";

const require = createRequire(import.meta.url);

type PgClient = PostgresRawEventClient & {
  connect(): Promise<void>;
  end(): Promise<void>;
};

const { Client } = require("pg") as {
  Client: new (options: { connectionString: string; application_name: string }) => PgClient;
};

const runId = `runtime-s3-${Date.now()}`;
const idempotencyKey = `${runId}:idempotency`;
const firstEventId = `${runId}:event:first`;
const duplicateEventId = `${runId}:event:duplicate-attempt`;
const invalidReason = `${runId}: invalid fixture`;

const client = new Client({
  connectionString: loadPostgresTestConfig().databaseUrl,
  application_name: "data-dyna-postgres-raw-event-repository-spec",
});

await client.connect();

try {
  await cleanFixtures(client);

  const repository = new PostgresRawEventRepository(client);
  const accepted = await repository.persistAccepted(validEvent({ eventId: firstEventId, idempotencyKey }));

  assert.equal(accepted.duplicate, false);
  assert.equal(accepted.record.eventId, firstEventId);
  assert.equal(accepted.record.idempotencyKey, idempotencyKey);
  assert.equal(accepted.record.contractVersion, "event-contract.v1");
  assert.equal(accepted.record.source, "pos");
  assert.equal(accepted.record.domain, "transaction_scene");
  assert.equal(accepted.record.name, "pos.order_paid");
  assert.equal(accepted.record.producerService, "pos-lite-cashier");
  assert.equal(accepted.record.brandId, "brand-runtime-s3");
  assert.equal(accepted.record.storeId, "store-runtime-s3");
  assert.equal(accepted.record.entityType, "order");
  assert.equal(accepted.record.entityId, `${runId}:order`);
  assert.deepEqual(accepted.record.properties, { amount: 42.5, paymentMethod: "cash" });
  assert.equal(accepted.record.event.correlation.eventId, firstEventId);
  assert.match(accepted.record.receivedAt, /^\d{4}-\d{2}-\d{2}T/);

  const duplicate = await repository.persistAccepted(validEvent({ eventId: duplicateEventId, idempotencyKey }));
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.record.eventId, firstEventId);
  assert.equal(duplicate.record.idempotencyKey, idempotencyKey);

  const rawEventCount = await scalarCount(
    client,
    "SELECT COUNT(*)::int AS count FROM raw_events WHERE idempotency_key = $1",
    [idempotencyKey],
  );
  assert.equal(rawEventCount, 1);

  const invalidPayload = { malformed: true, nested: { amount: 42.5 }, receivedBy: "repository-spec" };
  const invalid = await repository.persistInvalid(invalidPayload, invalidReason);
  assert.equal(invalid.reason, invalidReason);
  assert.deepEqual(invalid.payload, invalidPayload);
  assert.match(invalid.receivedAt, /^\d{4}-\d{2}-\d{2}T/);

  const invalidCount = await scalarCount(
    client,
    "SELECT COUNT(*)::int AS count FROM invalid_raw_events WHERE reason = $1 AND payload = $2::jsonb",
    [invalidReason, JSON.stringify(invalidPayload)],
  );
  assert.equal(invalidCount, 1);
} finally {
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
      brandId: "brand-runtime-s3",
      storeId: "store-runtime-s3",
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
  await clientToClean.query("DELETE FROM raw_events WHERE idempotency_key = $1 OR event_id = ANY($2::text[])", [
    idempotencyKey,
    [firstEventId, duplicateEventId],
  ]);
  await clientToClean.query("DELETE FROM invalid_raw_events WHERE reason = $1", [invalidReason]);
}

async function scalarCount(clientToQuery: PgClient, sql: string, values: readonly unknown[]): Promise<number> {
  const result = await clientToQuery.query<{ count: number }>(sql, values);
  const count = result.rows[0]?.count;
  assert.equal(typeof count, "number");
  return count;
}
