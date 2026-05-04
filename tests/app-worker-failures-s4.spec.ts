import assert from "node:assert/strict";
import {
  classifyWorkerFailure,
  runClaimedWorkerJob,
  WorkerExecutionError,
  type ClaimedWorkerJob,
  type WorkerFailureClass,
  type WorkerFailureReasonCode,
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
const tenantScope: WorkerTenantScope = { brandId: "brand-1", merchantId: "merchant-1", storeId: "store-1" };
const sourceScope: WorkerSourceScope = { source: "pos", producerService: "fixture", producerEnvironment: "test" };
const watermark: WorkerWatermark = { upper: { eventId: "evt-order-paid", receivedAt: "2026-05-04T00:00:00.000Z" } };

async function main(): Promise<void> {
  assertClassificationCoverage();

  const retryRepository = new FailureRecordingWorkerJobRepository([claimedJob("projection", "job-retry", 1, 3)]);
  const retryRun = await runClaimedWorkerJob({
    workerKind: "projection",
    jobRepository: retryRepository,
    workerId: "worker-s4",
    now,
    buildOutput: async () => ({
      output: { rows: 1 },
      outputWatermark: { committed: true },
      outputSummary: { rows: 1 },
    }),
    writeOutput: async () => {
      throw sensitiveStorageError();
    },
    failurePolicy: { retryBaseDelaySeconds: 5, retryMaxDelaySeconds: 20 },
  });
  assert.equal(retryRun.status, "retry_scheduled");
  assert.deepEqual(retryRepository.events, ["claim:projection", "retry:job-retry"]);
  assert.equal(retryRepository.freshness, undefined, "failed output writes must not advance checkpoint freshness");
  assert.equal(retryRepository.retries[0]?.failureClass, "transient_storage");
  assert.equal(retryRepository.retries[0]?.safeDiagnostic.reasonCode, "storage_unavailable");
  assert.ok(retryRepository.retries[0]?.nextRunAt.getTime() > now.getTime(), "retry backoff must not hot-loop immediately");
  assertSafeDiagnostic(retryRepository.retries[0]?.safeDiagnostic);

  const deadLetterRepository = new FailureRecordingWorkerJobRepository([claimedJob("projection", "job-dead-letter", 3, 3)]);
  const deadLetterRun = await runClaimedWorkerJob({
    workerKind: "projection",
    jobRepository: deadLetterRepository,
    workerId: "worker-s4",
    now,
    buildOutput: async () => ({
      output: { rows: 1 },
      outputWatermark: { committed: true },
      outputSummary: { rows: 1 },
    }),
    writeOutput: async () => {
      throw sensitiveStorageError();
    },
    failurePolicy: { retryBaseDelaySeconds: 5, nextOperatorAction: "inspect_safe_diagnostic_then_requeue" },
  });
  assert.equal(deadLetterRun.status, "dead_lettered");
  assert.deepEqual(deadLetterRepository.events, ["claim:projection", "deadLetter:job-dead-letter"]);
  assert.equal(deadLetterRepository.freshness, undefined, "dead-lettering a failed output write must not advance checkpoint freshness");
  assert.equal(deadLetterRepository.deadLetters.length, 1, "dead-lettered jobs must remain queryable in the durable audit trail");
  assert.equal(deadLetterRepository.deadLetters[0]?.reasonCode, "storage_unavailable");
  assert.equal(deadLetterRepository.deadLetters[0]?.nextOperatorAction, "inspect_safe_diagnostic_then_requeue");
  assertSafeDiagnostic(deadLetterRepository.deadLetters[0]?.safeDiagnostic);

  const terminalRepository = new FailureRecordingWorkerJobRepository([claimedJob("snapshot", "job-contract", 1, 3)]);
  const terminalRun = await runClaimedWorkerJob({
    workerKind: "snapshot",
    jobRepository: terminalRepository,
    workerId: "worker-s4",
    now,
    buildOutput: async () => {
      throw new WorkerExecutionError("snapshot contract mismatch", {
        failureClass: "contract_violation",
        reasonCode: "contract_violation",
        safeDiagnostic: { field: "snapshotDate", rawPayload: "must-not-persist" },
      });
    },
    writeOutput: async () => undefined,
    failurePolicy: { retryBaseDelaySeconds: 5 },
  });
  assert.equal(terminalRun.status, "dead_lettered", "contract violations are terminal instead of retry hot-loops");
  assert.equal(terminalRepository.deadLetters[0]?.failureClass, "contract_violation");
  assertSafeDiagnostic(terminalRepository.deadLetters[0]?.safeDiagnostic);

  const checkpointFailureRepository = new FailureRecordingWorkerJobRepository([claimedJob("evidence", "job-checkpoint-failure", 1, 3)], { failCheckpoint: true });
  const checkpointFailureRun = await runClaimedWorkerJob({
    workerKind: "evidence",
    jobRepository: checkpointFailureRepository,
    workerId: "worker-s4",
    now,
    buildOutput: async () => ({
      output: { evidenceRecordId: "evidence-record-1" },
      outputWatermark: { evidenceRecordId: "evidence-record-1" },
      outputSummary: { evidenceRecords: 1 },
    }),
    writeOutput: async () => undefined,
    failurePolicy: { retryBaseDelaySeconds: 5 },
  });
  assert.equal(checkpointFailureRun.status, "retry_scheduled");
  assert.deepEqual(checkpointFailureRepository.events, ["claim:evidence", "checkpoint:job-checkpoint-failure", "retry:job-checkpoint-failure"]);
  assert.equal(checkpointFailureRepository.freshness, undefined, "failed checkpoint writes must not publish freshness");

  const successRepository = new FailureRecordingWorkerJobRepository([
    claimedJob("benchmark", "job-success-1", 1, 3),
    claimedJob("benchmark", "job-success-2", 1, 3),
  ]);
  const outputStore = new ReplacingOutputStore();
  const firstSuccess = await runClaimedWorkerJob({
    workerKind: "benchmark",
    jobRepository: successRepository,
    workerId: "worker-s4",
    now,
    buildOutput: async () => ({
      output: { deterministicFacts: ["gap-1"] },
      outputWatermark: { committedGapId: "gap-1" },
      outputSummary: { gaps: 1 },
    }),
    writeOutput: (output) => outputStore.replaceAll(output),
    failurePolicy: { retryBaseDelaySeconds: 5 },
  });
  const secondSuccess = await runClaimedWorkerJob({
    workerKind: "benchmark",
    jobRepository: successRepository,
    workerId: "worker-s4",
    now,
    buildOutput: async () => ({
      output: { deterministicFacts: ["gap-1"] },
      outputWatermark: { committedGapId: "gap-1" },
      outputSummary: { gaps: 1 },
    }),
    writeOutput: (output) => outputStore.replaceAll(output),
    failurePolicy: { retryBaseDelaySeconds: 5 },
  });
  assert.equal(firstSuccess.status, "completed");
  assert.equal(secondSuccess.status, "completed");
  assert.deepEqual(outputStore.current, { deterministicFacts: ["gap-1"] });
  assert.equal(outputStore.writeCount, 2, "successful reruns replace deterministic output instead of appending");
  assert.deepEqual(successRepository.events, [
    "claim:benchmark",
    "checkpoint:job-success-1",
    "complete:job-success-1",
    "claim:benchmark",
    "checkpoint:job-success-2",
    "complete:job-success-2",
  ]);
}

function assertClassificationCoverage(): void {
  const cases: Array<{
    failureClass: WorkerFailureClass;
    reasonCode: WorkerFailureReasonCode;
    expectedAction: "retry" | "dead_letter";
  }> = [
    { failureClass: "transient_storage", reasonCode: "storage_unavailable", expectedAction: "retry" },
    { failureClass: "transient_runtime", reasonCode: "runtime_exception", expectedAction: "retry" },
    { failureClass: "contract_violation", reasonCode: "contract_violation", expectedAction: "dead_letter" },
    { failureClass: "tenant_policy", reasonCode: "tenant_policy_rejected", expectedAction: "dead_letter" },
    { failureClass: "idempotency_conflict", reasonCode: "idempotency_conflict", expectedAction: "dead_letter" },
  ];

  for (const testCase of cases) {
    const decision = classifyWorkerFailure({
      claimed: claimedJob("evidence", `classification:${testCase.failureClass}`, 1, 3),
      now,
      error: new WorkerExecutionError(testCase.reasonCode, {
        failureClass: testCase.failureClass,
        reasonCode: testCase.reasonCode,
      }),
      policy: { retryBaseDelaySeconds: 5 },
    });
    assert.equal(decision.failureClass, testCase.failureClass);
    assert.equal(decision.reasonCode, testCase.reasonCode);
    assert.equal(decision.action, testCase.expectedAction);
  }

  const unexpected = classifyWorkerFailure({
    claimed: claimedJob("evidence", "classification:unexpected", 1, 3),
    now,
    error: new Error("unexpected fixture failure"),
    policy: { retryBaseDelaySeconds: 5 },
  });
  assert.equal(unexpected.failureClass, "unexpected");
  assert.equal(unexpected.reasonCode, "unexpected_worker_failure");
  assert.equal(unexpected.action, "retry");
}

function sensitiveStorageError(): WorkerExecutionError {
  return new WorkerExecutionError("temporary output store unavailable bearer secret-token-value idempotencyKey=idem-key-value paymentId=payment-123 customerPhone=+8613800000000 card=4111111111111111", {
    failureClass: "transient_storage",
    reasonCode: "storage_unavailable",
    safeDiagnostic: {
      operation: "replaceAll",
      publicCode: "OUTPUT_STORE_UNAVAILABLE",
      bearerToken: "secret-token-value",
      idempotencyKey: "idem-key-value",
      paymentId: "payment-123",
      customerPhone: "+8613800000000",
      rawPayload: { cardNumber: "4111111111111111" },
    },
  });
}

function assertSafeDiagnostic(diagnostic: WorkerSafeDiagnostic | undefined): void {
  assert.ok(diagnostic);
  const encoded = JSON.stringify(diagnostic);
  assert.doesNotMatch(encoded, /secret-token-value|idem-key-value|payment-123|13800000000|4111111111111111|must-not-persist/);
  assert.match(encoded, /OUTPUT_STORE_UNAVAILABLE|storage_unavailable|job-/);
}

class ReplacingOutputStore {
  current?: unknown;
  writeCount = 0;

  async replaceAll(output: unknown): Promise<void> {
    this.current = output;
    this.writeCount += 1;
  }
}

class FailureRecordingWorkerJobRepository implements WorkerJobRepository {
  readonly events: string[] = [];
  readonly retries: Array<{
    jobId: string;
    failureClass: WorkerFailureClass;
    nextRunAt: Date;
    safeDiagnostic: WorkerSafeDiagnostic;
  }> = [];
  readonly deadLetters: Array<{
    jobId: string;
    failureClass: WorkerFailureClass;
    reasonCode: string;
    safeDiagnostic: WorkerSafeDiagnostic;
    nextOperatorAction: string;
  }> = [];
  freshness?: WorkerFreshnessRecord;
  private readonly claimedJobs: ClaimedWorkerJob[];

  constructor(
    claimedJobs: ClaimedWorkerJob[],
    private readonly options: { failCheckpoint?: boolean } = {},
  ) {
    this.claimedJobs = [...claimedJobs];
  }

  async enqueue(): Promise<never> {
    throw new Error("enqueue is not used by this failure-policy test");
  }

  async claim(input: { workerKind: WorkerKind }): Promise<ClaimedWorkerJob | undefined> {
    this.events.push(`claim:${input.workerKind}`);
    return this.claimedJobs.shift();
  }

  async heartbeat(): Promise<ClaimedWorkerJob | undefined> {
    throw new Error("heartbeat is not used by this failure-policy test");
  }

  async checkpoint(jobId: string, attemptId: number, outputWatermark: WorkerWatermark, outputSummary: WorkerOutputSummary, committedAt: Date): Promise<WorkerFreshnessRecord> {
    this.events.push(`checkpoint:${jobId}`);
    if (this.options.failCheckpoint) {
      throw new WorkerExecutionError("checkpoint store unavailable", {
        failureClass: "transient_storage",
        reasonCode: "storage_unavailable",
        safeDiagnostic: { operation: "checkpoint", rawPayload: "must-not-persist" },
      });
    }
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
      committedAt: committedAt.toISOString(),
      updatedAt: committedAt.toISOString(),
    };
    return this.freshness;
  }

  async complete(jobId: string): Promise<WorkerJobRecord> {
    this.events.push(`complete:${jobId}`);
    const claimed = claimedJobsById.get(jobId);
    if (!claimed) throw new Error(`Missing claimed job fixture ${jobId}`);
    return { ...claimed.job, status: "succeeded", completedAt: now.toISOString() };
  }

  async retry(jobId: string, _attemptId: number, failureClass: WorkerFailureClass, nextRunAt: Date, safeDiagnostic: WorkerSafeDiagnostic): Promise<WorkerJobRecord> {
    this.events.push(`retry:${jobId}`);
    this.retries.push({ jobId, failureClass, nextRunAt, safeDiagnostic });
    const claimed = claimedJobsById.get(jobId);
    if (!claimed) throw new Error(`Missing claimed job fixture ${jobId}`);
    return { ...claimed.job, status: "retry_scheduled", lastErrorClass: failureClass, lastErrorReason: String(safeDiagnostic.reasonCode) };
  }

  async deadLetter(
    jobId: string,
    _attemptId: number,
    failureClass: WorkerFailureClass,
    reasonCode: string,
    safeDiagnostic: WorkerSafeDiagnostic,
    nextOperatorAction: string,
  ): Promise<WorkerJobRecord> {
    this.events.push(`deadLetter:${jobId}`);
    this.deadLetters.push({ jobId, failureClass, reasonCode, safeDiagnostic, nextOperatorAction });
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
    inputWatermark: watermark,
    idempotencyIdentity: `${workerKind}:${jobId}`,
    correlationId: `correlation:${jobId}`,
    attemptCount,
    maxAttempts,
    lockedBy: "worker-s4",
    lockedUntil: now.toISOString(),
    heartbeatAt: now.toISOString(),
    nextRunAt: now.toISOString(),
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
      claimedBy: "worker-s4",
      status: "started",
      inputWatermark: watermark,
      safeDiagnostic: {},
      startedAt: now.toISOString(),
      heartbeatAt: now.toISOString(),
    },
  };
  claimedJobsById.set(jobId, claimed);
  return claimed;
}

await main();
