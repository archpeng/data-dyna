import assert from "node:assert/strict";
import { InMemoryRuntimeLogSink } from "../src/app/observability/runtime-log.ts";
import { InMemoryRuntimeMetricSink, type RuntimeMetricLabels, type RuntimeMetricName } from "../src/app/observability/runtime-metrics.ts";
import {
  readWorkerResumeWatermark,
  runClaimedWorkerJob,
  WorkerExecutionError,
  type ClaimedWorkerJob,
  type WorkerFailureClass,
  type WorkerFreshnessRecord,
  type WorkerJobRecord,
  type WorkerJobRepository,
  type WorkerKind,
  type WorkerOutputSummary,
  type WorkerSafeDiagnostic,
  type WorkerSourceScope,
  type WorkerTenantScope,
  type WorkerWatermark,
} from "../src/app/workers/index.ts";

const now = new Date("2026-05-04T00:00:00.000Z");
const tenantScope: WorkerTenantScope = { brandId: "brand-obs", merchantId: "merchant-obs", storeId: "store-obs" };
const sourceScope: WorkerSourceScope = { source: "pos", producerService: "fixture", producerEnvironment: "test" };
const inputWatermark: WorkerWatermark = { lower: "safe-lower-bound", upper: "safe-upper-bound" };

const logSink = new InMemoryRuntimeLogSink();
const metricSink = new InMemoryRuntimeMetricSink();
const observability = { runtimeEnvironment: "test" as const, logSink, metricSink };

async function main(): Promise<void> {
  const repository = new ObservabilityWorkerJobRepository([
    claimedJob("projection", "job-observable-success", 1, 3),
    claimedJob("projection", "job-observable-retry", 1, 3),
    claimedJob("projection", "job-observable-dead-letter", 3, 3),
  ]);

  const successRun = await runClaimedWorkerJob({
  workerKind: "projection",
  jobRepository: repository,
  workerId: "worker-observability-s5",
  now,
  buildOutput: async () => ({
    output: { rows: 1 },
    outputWatermark: { processedEventCount: 1, outputCommittedAt: now.toISOString() },
    outputSummary: { rows: 1 },
  }),
  writeOutput: async () => undefined,
  failurePolicy: { retryBaseDelaySeconds: 5 },
  observability,
});
assert.equal(successRun.status, "completed");

const resumeWatermark = await readWorkerResumeWatermark({
  jobRepository: repository,
  workerKind: "projection",
  tenantScope,
  sourceScope,
  fallbackWatermark: { fallback: true },
});
assert.deepEqual(resumeWatermark, { processedEventCount: 1, outputCommittedAt: now.toISOString() });

const retryRun = await runClaimedWorkerJob({
  workerKind: "projection",
  jobRepository: repository,
  workerId: "worker-observability-s5",
  now,
  buildOutput: async () => ({
    output: { rows: 1 },
    outputWatermark: { processedEventCount: 1 },
    outputSummary: { rows: 1 },
  }),
  writeOutput: async () => {
    throw sensitiveWorkerError();
  },
  failurePolicy: { retryBaseDelaySeconds: 5 },
  observability,
});
assert.equal(retryRun.status, "retry_scheduled");

const deadLetterRun = await runClaimedWorkerJob({
  workerKind: "projection",
  jobRepository: repository,
  workerId: "worker-observability-s5",
  now,
  buildOutput: async () => ({
    output: { rows: 1 },
    outputWatermark: { processedEventCount: 1 },
    outputSummary: { rows: 1 },
  }),
  writeOutput: async () => {
    throw sensitiveWorkerError();
  },
  failurePolicy: { retryBaseDelaySeconds: 5, nextOperatorAction: "inspect_safe_diagnostic_then_requeue" },
  observability,
});
assert.equal(deadLetterRun.status, "dead_lettered");

assert.equal(countLogEvents("worker.job.started"), 3);
assert.equal(countLogEvents("worker.job.checkpointed"), 1);
assert.equal(countLogEvents("worker.job.completed"), 1);
assert.equal(countLogEvents("worker.job.failed"), 2);
assert.equal(countLogEvents("worker.job.retry_scheduled"), 1);
assert.equal(countLogEvents("worker.job.dead_lettered"), 1);
assert.equal(metricSum("data_dyna_worker_jobs_total", { worker_kind: "projection", outcome: "started" }), 3);
assert.equal(metricSum("data_dyna_worker_jobs_total", { worker_kind: "projection", outcome: "completed" }), 1);
assert.equal(metricSum("data_dyna_worker_jobs_total", { worker_kind: "projection", outcome: "failed", failure_class: "transient_storage", reason_code: "storage_unavailable" }), 2);
assert.equal(metricSum("data_dyna_worker_jobs_total", { worker_kind: "projection", outcome: "retry_scheduled", failure_class: "transient_storage", reason_code: "storage_unavailable" }), 1);
assert.equal(metricSum("data_dyna_worker_jobs_total", { worker_kind: "projection", outcome: "dead_lettered", failure_class: "transient_storage", reason_code: "storage_unavailable" }), 1);
assert.equal(metricSum("data_dyna_worker_checkpoints_total", { worker_kind: "projection", outcome: "checkpointed" }), 1);
assert.equal(metricCount("data_dyna_worker_duration_ms"), 3);
assert.equal(metricCount("data_dyna_worker_lag_ms"), 3);

const encodedObservability = JSON.stringify({ logs: logSink.records, metrics: metricSink.records });
assert.doesNotMatch(encodedObservability, /secret-token-value|idem-key-value|payment-123|13800000000|4111111111111111|raw-payment-payload/);
  assert.match(encodedObservability, /worker\.job\.dead_lettered|data_dyna_worker_lag_ms|storage_unavailable/);
}

function sensitiveWorkerError(): WorkerExecutionError {
  return new WorkerExecutionError("temporary output unavailable bearer secret-token-value idempotencyKey=idem-key-value paymentId=payment-123 customerPhone=+8613800000000 card=4111111111111111", {
    failureClass: "transient_storage",
    reasonCode: "storage_unavailable",
    safeDiagnostic: {
      operation: "replaceAll",
      rawPayload: "raw-payment-payload",
      bearerToken: "secret-token-value",
      idempotencyKey: "idem-key-value",
      paymentId: "payment-123",
      customerPhone: "+8613800000000",
      cardNumber: "4111111111111111",
    },
  });
}

function countLogEvents(event: string): number {
  return logSink.records.filter((record) => record.event === event).length;
}

function metricSum(name: RuntimeMetricName, labels: RuntimeMetricLabels): number {
  return metricSink.sum(name, labels);
}

function metricCount(name: RuntimeMetricName): number {
  return metricSink.records.filter((record) => record.name === name).length;
}

class ObservabilityWorkerJobRepository implements WorkerJobRepository {
  freshness?: WorkerFreshnessRecord;
  private readonly claimedJobs: ClaimedWorkerJob[];

  constructor(claimedJobs: ClaimedWorkerJob[]) {
    this.claimedJobs = [...claimedJobs];
  }

  async enqueue(): Promise<never> {
    throw new Error("enqueue is not used by this observability test");
  }

  async claim(): Promise<ClaimedWorkerJob | undefined> {
    return this.claimedJobs.shift();
  }

  async heartbeat(): Promise<ClaimedWorkerJob | undefined> {
    throw new Error("heartbeat is not used by this observability test");
  }

  async checkpoint(jobId: string, attemptId: number, outputWatermark: WorkerWatermark, outputSummary: WorkerOutputSummary): Promise<WorkerFreshnessRecord> {
    const claimed = claimedJobsById.get(jobId);
    if (!claimed) throw new Error(`Missing claimed job fixture ${jobId}`);
    this.freshness = {
      checkpointId: `checkpoint:${jobId}`,
      workerKind: claimed.job.workerKind,
      tenantScope: claimed.job.tenantScope,
      sourceScope: claimed.job.sourceScope,
      committedWatermark: outputWatermark,
      committedJobId: jobId,
      committedAttemptId: attemptId,
      outputSummary,
      committedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    return this.freshness;
  }

  async complete(jobId: string): Promise<WorkerJobRecord> {
    const claimed = claimedJobsById.get(jobId);
    if (!claimed) throw new Error(`Missing claimed job fixture ${jobId}`);
    return { ...claimed.job, status: "succeeded", completedAt: now.toISOString() };
  }

  async retry(jobId: string, _attemptId: number, failureClass: WorkerFailureClass, _nextRunAt: Date, safeDiagnostic: WorkerSafeDiagnostic): Promise<WorkerJobRecord> {
    const claimed = claimedJobsById.get(jobId);
    if (!claimed) throw new Error(`Missing claimed job fixture ${jobId}`);
    return { ...claimed.job, status: "retry_scheduled", lastErrorClass: failureClass, lastErrorReason: String(safeDiagnostic.reasonCode) };
  }

  async deadLetter(jobId: string, _attemptId: number, failureClass: WorkerFailureClass, reasonCode: string): Promise<WorkerJobRecord> {
    const claimed = claimedJobsById.get(jobId);
    if (!claimed) throw new Error(`Missing claimed job fixture ${jobId}`);
    return { ...claimed.job, status: "dead_lettered", lastErrorClass: failureClass, lastErrorReason: reasonCode, completedAt: now.toISOString() };
  }

  async readFreshness(): Promise<WorkerFreshnessRecord | undefined> {
    return this.freshness;
  }
}

const claimedJobsById = new Map<string, ClaimedWorkerJob>();

function claimedJob(workerKind: WorkerKind, jobId: string, attemptCount: number, maxAttempts: number): ClaimedWorkerJob {
  const job: WorkerJobRecord = {
    jobId,
    workerKind,
    status: "running",
    tenantScope,
    sourceScope,
    inputWatermark,
    idempotencyIdentity: `${workerKind}:${jobId}`,
    correlationId: `correlation:${jobId}`,
    attemptCount,
    maxAttempts,
    lockedBy: "worker-observability-s5",
    lockedUntil: now.toISOString(),
    heartbeatAt: now.toISOString(),
    nextRunAt: new Date(now.getTime() - 120_000).toISOString(),
    startedAt: now.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const claimed: ClaimedWorkerJob = {
    job,
    attempt: {
      attemptId: claimedJobsById.size + 1,
      jobId,
      attemptNumber: attemptCount,
      workerKind,
      claimedBy: "worker-observability-s5",
      status: "started",
      inputWatermark,
      safeDiagnostic: {},
      startedAt: now.toISOString(),
      heartbeatAt: now.toISOString(),
    },
  };
  claimedJobsById.set(jobId, claimed);
  return claimed;
}

await main();
