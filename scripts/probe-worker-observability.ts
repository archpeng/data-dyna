import assert from "node:assert/strict";
import { InMemoryRuntimeLogSink } from "../src/app/observability/runtime-log.ts";
import { InMemoryRuntimeMetricSink, type RuntimeMetricName } from "../src/app/observability/runtime-metrics.ts";
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
const tenantScope: WorkerTenantScope = { merchantId: "merchant-worker-probe", storeId: "store-worker-probe" };
const sourceScope: WorkerSourceScope = { source: "pos", producerService: "fixture", producerEnvironment: "test" };
const inputWatermark: WorkerWatermark = { lower: "safe-probe-lower", upper: "safe-probe-upper" };
const logSink = new InMemoryRuntimeLogSink();
const metricSink = new InMemoryRuntimeMetricSink();
const observability = { runtimeEnvironment: "test" as const, logSink, metricSink };
async function main(): Promise<void> {
  const repository = new ProbeWorkerJobRepository([
    claimedJob("projection", "worker-probe-success", 1, 3),
    claimedJob("projection", "worker-probe-retry", 1, 3),
    claimedJob("projection", "worker-probe-dead-letter", 3, 3),
  ]);

  const success = await runClaimedWorkerJob({
  workerKind: "projection",
  jobRepository: repository,
  workerId: "worker-observability-probe",
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

const resumeWatermark = await readWorkerResumeWatermark({
  jobRepository: repository,
  workerKind: "projection",
  tenantScope,
  sourceScope,
  fallbackWatermark: { fallback: true },
});

const retry = await runClaimedWorkerJob({
  workerKind: "projection",
  jobRepository: repository,
  workerId: "worker-observability-probe",
  now,
  buildOutput: async () => ({ output: { rows: 1 }, outputWatermark: { processedEventCount: 1 }, outputSummary: { rows: 1 } }),
  writeOutput: async () => { throw sensitiveWorkerError(); },
  failurePolicy: { retryBaseDelaySeconds: 5 },
  observability,
});

const deadLetter = await runClaimedWorkerJob({
  workerKind: "projection",
  jobRepository: repository,
  workerId: "worker-observability-probe",
  now,
  buildOutput: async () => ({ output: { rows: 1 }, outputWatermark: { processedEventCount: 1 }, outputSummary: { rows: 1 } }),
  writeOutput: async () => { throw sensitiveWorkerError(); },
  failurePolicy: { retryBaseDelaySeconds: 5, nextOperatorAction: "inspect_safe_diagnostic_then_requeue" },
  observability,
});

const summary = {
  service: "data-dyna",
  runtimeEnvironment: "test",
  workerKind: "projection",
  statuses: {
    success: success.status,
    retry: retry.status,
    deadLetter: deadLetter.status,
  },
  resumeWatermark,
  logEvents: countBy(logSink.records.map((record) => record.event)),
  metricCounters: {
    started: metricSum("data_dyna_worker_jobs_total", "started"),
    completed: metricSum("data_dyna_worker_jobs_total", "completed"),
    failed: metricSum("data_dyna_worker_jobs_total", "failed"),
    retryScheduled: metricSum("data_dyna_worker_jobs_total", "retry_scheduled"),
    deadLettered: metricSum("data_dyna_worker_jobs_total", "dead_lettered"),
    checkpointed: metricSink.sum("data_dyna_worker_checkpoints_total", { worker_kind: "projection", outcome: "checkpointed" }),
    durationObservations: metricCount("data_dyna_worker_duration_ms"),
    lagObservations: metricCount("data_dyna_worker_lag_ms"),
  },
  failureEvidence: {
    retry: failureEvent("worker.job.retry_scheduled"),
    deadLetter: failureEvent("worker.job.dead_lettered"),
  },
  residuals: [
    "production dashboards/SLOs/paging/incident management remain residual",
    "probe uses in-memory local/test sinks and no external services",
  ],
};

assert.equal(summary.statuses.success, "completed");
assert.equal(summary.statuses.retry, "retry_scheduled");
assert.equal(summary.statuses.deadLetter, "dead_lettered");
assert.equal(summary.metricCounters.started, 3);
assert.equal(summary.metricCounters.completed, 1);
assert.equal(summary.metricCounters.failed, 2);
assert.equal(summary.metricCounters.retryScheduled, 1);
assert.equal(summary.metricCounters.deadLettered, 1);
assert.equal(summary.metricCounters.checkpointed, 1);
assert.equal(summary.metricCounters.durationObservations, 3);
assert.equal(summary.metricCounters.lagObservations, 3);
assert.deepEqual(summary.failureEvidence.retry, {
  failureClass: "transient_storage",
  reasonCode: "storage_unavailable",
  nextAction: "retry_after_backoff",
});
assert.deepEqual(summary.failureEvidence.deadLetter, {
  failureClass: "transient_storage",
  reasonCode: "storage_unavailable",
  nextAction: "inspect_safe_diagnostic_then_requeue",
});
assert.deepEqual(summary.resumeWatermark, { processedEventCount: 1, outputCommittedAt: now.toISOString() });
const encodedEvidence = JSON.stringify({ logs: logSink.records, metrics: metricSink.records, summary });
assert.doesNotMatch(encodedEvidence, /secret-token-value|idem-key-value|payment-123|13800000000|4111111111111111|raw-payment-payload/);

  console.log("Worker observability probe passed:");
  console.log(JSON.stringify(summary, null, 2));
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

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function metricSum(name: RuntimeMetricName, outcome: string): number {
  return metricSink.sum(name, { worker_kind: "projection", outcome });
}

function metricCount(name: RuntimeMetricName): number {
  return metricSink.records.filter((record) => record.name === name).length;
}

function failureEvent(event: "worker.job.retry_scheduled" | "worker.job.dead_lettered"): {
  failureClass: string | undefined;
  reasonCode: string | undefined;
  nextAction: string | undefined;
} {
  const record = logSink.records.find((candidate) => candidate.event === event);
  return {
    failureClass: record?.failure_class,
    reasonCode: record?.reason_code,
    nextAction: record?.next_action,
  };
}

class ProbeWorkerJobRepository implements WorkerJobRepository {
  freshness?: WorkerFreshnessRecord;
  private readonly claimedJobs: ClaimedWorkerJob[];

  constructor(claimedJobs: ClaimedWorkerJob[]) {
    this.claimedJobs = [...claimedJobs];
  }

  async enqueue(): Promise<never> { throw new Error("enqueue is not used by this probe"); }
  async claim(): Promise<ClaimedWorkerJob | undefined> { return this.claimedJobs.shift(); }
  async heartbeat(): Promise<ClaimedWorkerJob | undefined> { throw new Error("heartbeat is not used by this probe"); }

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

  async readFreshness(): Promise<WorkerFreshnessRecord | undefined> { return this.freshness; }
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
    lockedBy: "worker-observability-probe",
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
      claimedBy: "worker-observability-probe",
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
