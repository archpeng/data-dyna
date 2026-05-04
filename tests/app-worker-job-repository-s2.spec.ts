import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { loadPostgresTestConfig } from "../src/app/config/postgres-test-config.ts";
import {
  PostgresWorkerJobRepository,
  type PostgresWorkerJobClient,
} from "../src/app/workers/durable-worker-job-repository.ts";

const require = createRequire(import.meta.url);

type PgClient = PostgresWorkerJobClient & {
  connect(): Promise<void>;
  end(): Promise<void>;
};

const { Client } = require("pg") as {
  Client: new (options: { connectionString: string; application_name: string }) => PgClient;
};

const runId = `worker-s2-${Date.now()}`;
const tenantScope = {
  brandId: `${runId}:brand`,
  merchantId: `${runId}:merchant`,
  storeId: `${runId}:store`,
};
const sourceScope = {
  source: "pos",
  producerService: "pos-lite-cashier",
  producerEnvironment: "test",
};

const client = new Client({
  connectionString: loadPostgresTestConfig().databaseUrl,
  application_name: "data-dyna-worker-job-repository-s2-spec",
});

await client.connect();

try {
  await cleanFixtures(client);

  const repository = new PostgresWorkerJobRepository(client);
  const now = new Date("2026-05-04T00:00:00.000Z");
  const enqueueInput = {
    workerKind: "projection" as const,
    tenantScope,
    sourceScope,
    inputWatermark: {
      receivedAt: "2026-05-03T23:55:00.000Z",
      eventId: `${runId}:event:001`,
    },
    idempotencyIdentity: `${runId}:projection:pos:watermark:001`,
    correlationId: `${runId}:correlation:projection`,
    maxAttempts: 3,
    now,
  };

  const enqueued = await repository.enqueue(enqueueInput);
  assert.equal(enqueued.duplicate, false);
  assert.equal(enqueued.job.status, "queued");
  assert.equal(enqueued.job.workerKind, "projection");
  assert.deepEqual(enqueued.job.tenantScope, tenantScope);
  assert.deepEqual(enqueued.job.sourceScope, sourceScope);
  assert.deepEqual(enqueued.job.inputWatermark, enqueueInput.inputWatermark);
  assert.equal(enqueued.job.attemptCount, 0);

  const duplicate = await repository.enqueue({
    ...enqueueInput,
    now: new Date("2026-05-04T00:00:01.000Z"),
  });
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.job.jobId, enqueued.job.jobId);

  const duplicateCount = await scalarCount(
    client,
    `SELECT COUNT(*)::int AS count
       FROM worker_jobs
      WHERE merchant_id = $1
        AND store_id = $2
        AND idempotency_identity = $3`,
    [tenantScope.merchantId, tenantScope.storeId, enqueueInput.idempotencyIdentity],
  );
  assert.equal(duplicateCount, 1);

  const claimed = await repository.claim({
    workerKind: "projection",
    workerId: `${runId}:worker:a`,
    now: new Date("2026-05-04T00:00:02.000Z"),
    leaseSeconds: 60,
  });
  assert.ok(claimed);
  assert.equal(claimed.job.jobId, enqueued.job.jobId);
  assert.equal(claimed.job.status, "running");
  assert.equal(claimed.job.attemptCount, 1);
  assert.equal(claimed.attempt.attemptNumber, 1);
  assert.equal(claimed.attempt.status, "started");

  const secondClaimWhileRunning = await repository.claim({
    workerKind: "projection",
    workerId: `${runId}:worker:b`,
    now: new Date("2026-05-04T00:00:03.000Z"),
    leaseSeconds: 60,
  });
  assert.equal(secondClaimWhileRunning, undefined);

  const heartbeat = await repository.heartbeat(
    claimed.job.jobId,
    claimed.attempt.attemptId,
    new Date("2026-05-04T00:00:04.000Z"),
  );
  assert.equal(heartbeat?.job.status, "running");
  assert.match(heartbeat?.job.heartbeatAt ?? "", /^2026-05-04T00:00:04/);

  const outputWatermark = {
    receivedAt: "2026-05-03T23:55:00.000Z",
    eventId: `${runId}:event:001`,
  };
  const outputSummary = { outputRecordCount: 1, outputType: "orders" };
  const checkpoint = await repository.checkpoint(
    claimed.job.jobId,
    claimed.attempt.attemptId,
    outputWatermark,
    outputSummary,
    new Date("2026-05-04T00:00:05.000Z"),
  );
  assert.equal(checkpoint.workerKind, "projection");
  assert.deepEqual(checkpoint.committedWatermark, outputWatermark);
  assert.equal(checkpoint.committedJobId, claimed.job.jobId);
  assert.equal(checkpoint.committedAttemptId, claimed.attempt.attemptId);

  const completed = await repository.complete(
    claimed.job.jobId,
    claimed.attempt.attemptId,
    outputWatermark,
    outputSummary,
    new Date("2026-05-04T00:00:06.000Z"),
  );
  assert.equal(completed.status, "succeeded");
  assert.equal(completed.attemptCount, 1);

  const freshness = await repository.readFreshness("projection", tenantScope, sourceScope);
  assert.equal(freshness?.committedJobId, claimed.job.jobId);
  assert.deepEqual(freshness?.outputSummary, outputSummary);

  const retryJob = await repository.enqueue({
    workerKind: "snapshot",
    tenantScope,
    sourceScope,
    inputWatermark: {
      receivedAt: "2026-05-04T00:10:00.000Z",
      eventId: `${runId}:event:retry`,
    },
    idempotencyIdentity: `${runId}:snapshot:pos:watermark:retry`,
    correlationId: `${runId}:correlation:snapshot`,
    maxAttempts: 2,
    now: new Date("2026-05-04T00:10:00.000Z"),
  });
  const firstAttempt = await repository.claim({
    workerKind: "snapshot",
    workerId: `${runId}:worker:retry`,
    now: new Date("2026-05-04T00:10:01.000Z"),
    leaseSeconds: 60,
  });
  assert.ok(firstAttempt);
  assert.equal(firstAttempt.job.jobId, retryJob.job.jobId);

  const retried = await repository.retry(
    firstAttempt.job.jobId,
    firstAttempt.attempt.attemptId,
    "transient_storage",
    new Date("2026-05-04T00:11:00.000Z"),
    { reasonCode: "TRANSIENT_STORAGE_TIMEOUT", detail: "safe count-only retry fixture" },
    new Date("2026-05-04T00:10:02.000Z"),
  );
  assert.equal(retried.status, "retry_scheduled");
  assert.equal(retried.attemptCount, 1);
  assert.equal(retried.lastErrorClass, "transient_storage");

  const secondAttempt = await repository.claim({
    workerKind: "snapshot",
    workerId: `${runId}:worker:retry`,
    now: new Date("2026-05-04T00:11:00.000Z"),
    leaseSeconds: 60,
  });
  assert.ok(secondAttempt);
  assert.equal(secondAttempt.job.jobId, retryJob.job.jobId);
  assert.equal(secondAttempt.job.attemptCount, 2);

  let retryAtMaxAttemptsError: unknown;
  try {
    await repository.retry(
      secondAttempt.job.jobId,
      secondAttempt.attempt.attemptId,
      "transient_storage",
      new Date("2026-05-04T00:12:00.000Z"),
      { reasonCode: "TRANSIENT_STORAGE_TIMEOUT" },
      new Date("2026-05-04T00:11:01.000Z"),
    );
  } catch (error) {
    retryAtMaxAttemptsError = error;
  }
  assert.match((retryAtMaxAttemptsError as Error | undefined)?.message ?? "", /max attempts/i);

  const deadLettered = await repository.deadLetter(
    secondAttempt.job.jobId,
    secondAttempt.attempt.attemptId,
    "contract_violation",
    "WORKER_CONTRACT_VIOLATION",
    { reasonCode: "WORKER_CONTRACT_VIOLATION", detail: "safe diagnostic without raw payload" },
    "inspect_safe_dead_letter_and_fix_contract_input",
    new Date("2026-05-04T00:11:02.000Z"),
  );
  assert.equal(deadLettered.status, "dead_lettered");
  assert.equal(deadLettered.attemptCount, 2);

  const deadLetterRows = await client.query<{
    attempt_count: number;
    failure_class: string;
    reason_code: string;
    safe_diagnostic: { reasonCode: string; detail: string };
    next_operator_action: string;
  }>(
    `SELECT attempt_count, failure_class, reason_code, safe_diagnostic, next_operator_action
       FROM worker_dead_letters
      WHERE job_id = $1`,
    [retryJob.job.jobId],
  );
  assert.deepEqual(deadLetterRows.rows[0], {
    attempt_count: 2,
    failure_class: "contract_violation",
    reason_code: "WORKER_CONTRACT_VIOLATION",
    safe_diagnostic: {
      reasonCode: "WORKER_CONTRACT_VIOLATION",
      detail: "safe diagnostic without raw payload",
    },
    next_operator_action: "inspect_safe_dead_letter_and_fix_contract_input",
  });
} finally {
  await cleanFixtures(client).catch(() => undefined);
  await client.end();
}

async function cleanFixtures(clientToClean: PgClient): Promise<void> {
  await clientToClean.query("DELETE FROM worker_dead_letters WHERE merchant_id = $1", [tenantScope.merchantId]);
  await clientToClean.query("DELETE FROM worker_checkpoints WHERE merchant_id = $1", [tenantScope.merchantId]);
  await clientToClean.query("DELETE FROM worker_job_attempts WHERE job_id IN (SELECT job_id FROM worker_jobs WHERE merchant_id = $1)", [
    tenantScope.merchantId,
  ]);
  await clientToClean.query("DELETE FROM worker_jobs WHERE merchant_id = $1", [tenantScope.merchantId]);
}

async function scalarCount(clientToQuery: PgClient, sql: string, values: readonly unknown[]): Promise<number> {
  const result = await clientToQuery.query<{ count: number }>(sql, values);
  const count = result.rows[0]?.count;
  assert.equal(typeof count, "number");
  return count;
}
