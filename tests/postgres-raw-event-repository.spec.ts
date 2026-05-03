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
const crossTenantEventId = `${runId}:event:cross-tenant-reuse`;
const invalidReason = `${runId}: invalid fixture`;
const credentialId = `${runId}:credential:store-a`;
const crossTenantCredentialId = `${runId}:credential:store-b`;

const client = new Client({
  connectionString: loadPostgresTestConfig().databaseUrl,
  application_name: "data-dyna-postgres-raw-event-repository-spec",
});

await client.connect();

try {
  await cleanFixtures(client);

  const repository = new PostgresRawEventRepository(client);
  const accepted = await repository.persistAccepted(
    validEvent({
      eventId: firstEventId,
      idempotencyKey,
      merchantId: `${runId}:merchant-a`,
      storeId: `${runId}:store-a`,
    }),
    { credentialId },
  );

  assert.equal(accepted.duplicate, false);
  assert.equal(accepted.record.eventId, firstEventId);
  assert.equal(accepted.record.idempotencyKey, idempotencyKey);
  assert.equal(accepted.record.idempotencyScope, "store");
  assert.equal(accepted.record.contractVersion, "event-contract.v1");
  assert.equal(accepted.record.source, "pos");
  assert.equal(accepted.record.domain, "transaction_scene");
  assert.equal(accepted.record.name, "pos.order_paid");
  assert.equal(accepted.record.producerService, "pos-lite-cashier");
  assert.equal(accepted.record.producerEnvironment, "test");
  assert.equal(accepted.record.credentialId, credentialId);
  assert.equal(accepted.record.brandId, "brand-runtime-s3");
  assert.equal(accepted.record.merchantId, `${runId}:merchant-a`);
  assert.equal(accepted.record.storeId, `${runId}:store-a`);
  assert.equal(accepted.record.entityType, "order");
  assert.equal(accepted.record.entityId, `${runId}:order`);
  assert.deepEqual(accepted.record.properties, { amount: 42.5, paymentMethod: "cash" });
  assert.equal(accepted.record.event.correlation.eventId, firstEventId);
  assert.match(accepted.record.receivedAt, /^\d{4}-\d{2}-\d{2}T/);

  const persistedColumns = await client.query<{
    merchant_id: string;
    store_id: string;
    producer_environment: string;
    credential_id: string;
    idempotency_scope: string;
  }>(
    `SELECT merchant_id, store_id, producer_environment, credential_id, idempotency_scope
       FROM raw_events
      WHERE event_id = $1`,
    [firstEventId],
  );
  assert.deepEqual(persistedColumns.rows[0], {
    merchant_id: `${runId}:merchant-a`,
    store_id: `${runId}:store-a`,
    producer_environment: "test",
    credential_id: credentialId,
    idempotency_scope: "store",
  });

  const duplicate = await repository.persistAccepted(
    validEvent({
      eventId: duplicateEventId,
      idempotencyKey,
      merchantId: `${runId}:merchant-a`,
      storeId: `${runId}:store-a`,
    }),
    { credentialId },
  );
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.record.eventId, firstEventId);
  assert.equal(duplicate.record.idempotencyKey, idempotencyKey);
  assert.equal(duplicate.record.merchantId, `${runId}:merchant-a`);
  assert.equal(duplicate.record.storeId, `${runId}:store-a`);

  const crossTenantReuse = await repository.persistAccepted(
    validEvent({
      eventId: crossTenantEventId,
      idempotencyKey,
      merchantId: `${runId}:merchant-b`,
      storeId: `${runId}:store-b`,
    }),
    { credentialId: crossTenantCredentialId },
  );
  assert.equal(crossTenantReuse.duplicate, false);
  assert.equal(crossTenantReuse.record.eventId, crossTenantEventId);
  assert.equal(crossTenantReuse.record.idempotencyKey, idempotencyKey);
  assert.equal(crossTenantReuse.record.credentialId, crossTenantCredentialId);
  assert.equal(crossTenantReuse.record.merchantId, `${runId}:merchant-b`);
  assert.equal(crossTenantReuse.record.storeId, `${runId}:store-b`);

  const rawEventCount = await scalarCount(
    client,
    "SELECT COUNT(*)::int AS count FROM raw_events WHERE idempotency_key = $1",
    [idempotencyKey],
  );
  assert.equal(rawEventCount, 2);

  let eventIdCollisionError: unknown;
  try {
    await repository.persistAccepted(
      validEvent({
        eventId: firstEventId,
        idempotencyKey,
        merchantId: `${runId}:merchant-b`,
        storeId: `${runId}:store-b`,
      }),
      { credentialId: crossTenantCredentialId },
    );
  } catch (error) {
    eventIdCollisionError = error;
  }
  assert.equal((eventIdCollisionError as { code?: string } | undefined)?.code, "23505");

  const eventIdCollisionCount = await scalarCount(
    client,
    "SELECT COUNT(*)::int AS count FROM raw_events WHERE event_id = $1 AND merchant_id = $2",
    [firstEventId, `${runId}:merchant-a`],
  );
  assert.equal(eventIdCollisionCount, 1);

  const invalidPayload = { malformed: true, nested: { amount: 42.5 }, receivedBy: "repository-spec" };
  const invalid = await repository.persistInvalid(invalidPayload, invalidReason, {
    credentialId,
    merchantId: `${runId}:merchant-a`,
    storeId: `${runId}:store-a`,
    producerService: "pos-lite-cashier",
    producerEnvironment: "test",
    source: "pos",
    reasonCode: "TENANT_IDENTITY_REQUIRED",
  });
  assert.equal(invalid.reason, invalidReason);
  assert.deepEqual(invalid.payload, invalidPayload);
  assert.equal(invalid.credentialId, credentialId);
  assert.equal(invalid.merchantId, `${runId}:merchant-a`);
  assert.equal(invalid.storeId, `${runId}:store-a`);
  assert.equal(invalid.producerService, "pos-lite-cashier");
  assert.equal(invalid.producerEnvironment, "test");
  assert.equal(invalid.source, "pos");
  assert.equal(invalid.reasonCode, "TENANT_IDENTITY_REQUIRED");
  assert.match(invalid.receivedAt, /^\d{4}-\d{2}-\d{2}T/);

  const invalidCount = await scalarCount(
    client,
    "SELECT COUNT(*)::int AS count FROM invalid_raw_events WHERE reason = $1 AND payload = $2::jsonb AND reason_code = $3",
    [invalidReason, JSON.stringify(invalidPayload), "TENANT_IDENTITY_REQUIRED"],
  );
  assert.equal(invalidCount, 1);
} finally {
  await cleanFixtures(client).catch(() => undefined);
  await client.end();
}

function validEvent(options: {
  eventId: string;
  idempotencyKey: string;
  merchantId: string;
  storeId: string;
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
      brandId: "brand-runtime-s3",
      merchantId: options.merchantId,
      storeId: options.storeId,
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
    [firstEventId, duplicateEventId, crossTenantEventId],
  ]);
  await clientToClean.query("DELETE FROM invalid_raw_events WHERE reason = $1", [invalidReason]);
}

async function scalarCount(clientToQuery: PgClient, sql: string, values: readonly unknown[]): Promise<number> {
  const result = await clientToQuery.query<{ count: number }>(sql, values);
  const count = result.rows[0]?.count;
  assert.equal(typeof count, "number");
  return count;
}
