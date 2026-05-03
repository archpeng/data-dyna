#!/usr/bin/env node
import assert from 'node:assert/strict';
import pg from 'pg';

const { Client } = pg;

const databaseUrl = requiredEnv('DATA_DYNA_DATABASE_URL');
const baseUrl = runtimeBaseUrl();
const runId = `runtime-smoke-${Date.now()}`;
const idempotencyKey = `${runId}:event:idempotency`;
const duplicateEventId = `${runId}:event:duplicate-attempt`;
const firstEventId = `${runId}:event:first`;
const batchEventId = `${runId}:batch:event`;
const batchIdempotencyKey = `${runId}:batch:idempotency`;

const client = new Client({
  connectionString: databaseUrl,
  application_name: 'data-dyna-runtime-smoke',
});

async function main() {
  console.log(
    'Data Dyna runtime smoke preconditions: run migrations first, start npm run app:start separately, and set DATA_DYNA_DATABASE_URL to the migrated PostgreSQL database.',
  );

  await client.connect();
  try {
    await assertMigratedSchema();
    await cleanFixtures();

    const health = await requestJson('GET /healthz', '/healthz');
    assert.equal(health.status, 200, 'GET /healthz status');
    assert.equal(health.body.ok, true, 'GET /healthz ok');
    assert.equal(health.body.service, 'data-dyna', 'GET /healthz service');
    assert.equal(typeof health.body.runtimeEnvironment, 'string', 'GET /healthz runtimeEnvironment');

    const accepted = await requestJson('POST /events accepted', '/events', validEvent(firstEventId, idempotencyKey));
    assert.equal(accepted.status, 202, 'POST /events accepted status');
    assert.equal(accepted.body.ok, true, 'POST /events accepted ok');
    assert.equal(accepted.body.status, 202, 'POST /events accepted body status');
    assert.equal(accepted.body.duplicate, false, 'POST /events accepted duplicate');
    assert.equal(accepted.body.persisted?.eventId, firstEventId, 'POST /events accepted eventId');
    assert.equal(accepted.body.persisted?.idempotencyKey, idempotencyKey, 'POST /events accepted idempotencyKey');
    assert.equal(await rawEventCount([idempotencyKey, batchIdempotencyKey]), 1, 'accepted raw event count');

    const duplicate = await requestJson('POST /events duplicate', '/events', validEvent(duplicateEventId, idempotencyKey));
    assert.equal(duplicate.status, 202, 'POST /events duplicate status');
    assert.equal(duplicate.body.ok, true, 'POST /events duplicate ok');
    assert.equal(duplicate.body.status, 202, 'POST /events duplicate body status');
    assert.equal(duplicate.body.duplicate, true, 'POST /events duplicate flag');
    assert.equal(duplicate.body.persisted?.eventId, firstEventId, 'POST /events duplicate persisted eventId');
    assert.equal(duplicate.body.persisted?.idempotencyKey, idempotencyKey, 'POST /events duplicate idempotencyKey');
    assert.equal(await rawEventCount([idempotencyKey]), 1, 'duplicate raw event count');

    const invalidPayload = { smokeRunId: runId, invalidSingle: true };
    const invalid = await requestJson('POST /events invalid', '/events', invalidPayload);
    assert.equal(invalid.status, 400, 'POST /events invalid status');
    assert.equal(invalid.body.ok, false, 'POST /events invalid ok');
    assert.equal(invalid.body.status, 400, 'POST /events invalid body status');
    assert.deepEqual(invalid.body.invalid?.payload, invalidPayload, 'POST /events invalid payload');
    assert.equal(typeof invalid.body.invalid?.reason, 'string', 'POST /events invalid reason');
    assert.ok(invalid.body.invalid.reason.length > 0, 'POST /events invalid reason non-empty');

    const batch = await requestJson('POST /events/batch', '/events/batch', [validEvent(batchEventId, batchIdempotencyKey)]);
    assert.equal(batch.status, 207, 'POST /events/batch status');
    assert.equal(batch.body.ok, true, 'POST /events/batch ok');
    assert.equal(batch.body.status, 207, 'POST /events/batch body status');
    assert.equal(batch.body.results?.length, 1, 'POST /events/batch result count');
    assert.equal(batch.body.results?.[0]?.ok, true, 'POST /events/batch first ok');
    assert.equal(batch.body.results?.[0]?.status, 202, 'POST /events/batch first status');
    assert.equal(batch.body.results?.[0]?.duplicate, false, 'POST /events/batch first duplicate');
    assert.equal(batch.body.results?.[0]?.persisted?.eventId, batchEventId, 'POST /events/batch eventId');
    assert.equal(batch.body.results?.[0]?.persisted?.idempotencyKey, batchIdempotencyKey, 'POST /events/batch idempotencyKey');
    assert.equal(await rawEventCount([idempotencyKey, batchIdempotencyKey]), 2, 'batch raw event count');
    assert.equal(await invalidEventCount(), 1, 'invalid event count');
  } finally {
    await cleanFixtures().catch(() => undefined);
    await client.end();
  }

  console.log(`Runtime smoke passed against ${baseUrl} with run ${runId}.`);
}

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Runtime smoke precondition failed: ${name} must be set. Run npm run test:db:migrations, start npm run app:start with DATA_DYNA_DATABASE_URL, then run npm run smoke:runtime.`,
    );
  }

  return value;
}

function runtimeBaseUrl() {
  const host = process.env.DATA_DYNA_HTTP_HOST?.trim() || '127.0.0.1';
  const port = process.env.DATA_DYNA_HTTP_PORT?.trim() || '3000';
  const clientHost = host === '0.0.0.0' || host === '::' ? '127.0.0.1' : host;
  return `http://${formatHost(clientHost)}:${port}`;
}

function formatHost(host) {
  if (host.includes(':') && !host.startsWith('[')) {
    return `[${host}]`;
  }

  return host;
}

async function requestJson(label, path, payload) {
  let response;
  try {
    response = await fetch(new URL(path, baseUrl), {
      method: payload === undefined ? 'GET' : 'POST',
      headers: payload === undefined ? undefined : { 'content-type': 'application/json' },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
  } catch (error) {
    throw new Error(
      `${label} failed before HTTP response from ${baseUrl}: ${error.message}. Start the runtime server before running npm run smoke:runtime.`,
    );
  }

  const text = await response.text();
  let body;
  try {
    body = text.length === 0 ? undefined : JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} returned non-JSON response with status ${response.status}: ${text}`);
  }

  return { status: response.status, body };
}

function validEvent(eventId, eventIdempotencyKey) {
  return {
    version: 'event-contract.v1',
    source: 'pos',
    domain: 'transaction_scene',
    name: 'pos.order_paid',
    occurredAt: '2026-05-02T10:00:00.000Z',
    producer: {
      service: 'pos-lite-cashier',
      environment: 'test',
      emittedAt: '2026-05-02T10:00:01.000Z',
    },
    identity: {
      brandId: 'brand-runtime-smoke',
      storeId: 'store-runtime-smoke',
      memberId: `${runId}:member`,
      actorType: 'cashier',
    },
    correlation: {
      eventId,
      traceId: `${runId}:trace`,
    },
    entity: {
      type: 'order',
      id: `${runId}:order`,
    },
    properties: {
      amount: 42.5,
      paymentMethod: 'cash',
    },
    idempotency: {
      key: eventIdempotencyKey,
      scope: 'store',
    },
  };
}

async function assertMigratedSchema() {
  const result = await client.query(
    "SELECT to_regclass('public.raw_events') AS raw_events, to_regclass('public.invalid_raw_events') AS invalid_raw_events",
  );
  if (!result.rows[0]?.raw_events || !result.rows[0]?.invalid_raw_events) {
    throw new Error(
      'Runtime smoke precondition failed: migrated raw event tables are missing. Run npm run test:db:migrations before npm run smoke:runtime.',
    );
  }
}

async function cleanFixtures() {
  await client.query('DELETE FROM raw_events WHERE idempotency_key = ANY($1::text[]) OR event_id = ANY($2::text[])', [
    [idempotencyKey, batchIdempotencyKey],
    [firstEventId, duplicateEventId, batchEventId],
  ]);
  await client.query('DELETE FROM invalid_raw_events WHERE payload @> $1::jsonb', [
    JSON.stringify({ smokeRunId: runId }),
  ]);
}

async function rawEventCount(idempotencyKeys) {
  const result = await client.query(
    'SELECT COUNT(*)::int AS count FROM raw_events WHERE idempotency_key = ANY($1::text[])',
    [idempotencyKeys],
  );
  return result.rows[0]?.count;
}

async function invalidEventCount() {
  const result = await client.query('SELECT COUNT(*)::int AS count FROM invalid_raw_events WHERE payload @> $1::jsonb', [
    JSON.stringify({ smokeRunId: runId }),
  ]);
  return result.rows[0]?.count;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
