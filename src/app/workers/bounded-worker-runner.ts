import type {
  ClaimedWorkerJob,
  WorkerFreshnessRecord,
  WorkerJobRecord,
  WorkerJobRepository,
  WorkerOutputSummary,
  WorkerWatermark,
} from "./durable-worker-job-repository.ts";
import {
  recordWorkerJobCheckpointed,
  recordWorkerJobCompleted,
  recordWorkerJobFailed,
  recordWorkerJobStarted,
  type WorkerObservabilityInput,
} from "./worker-observability.ts";
import type { WorkerKind } from "./worker-contract.ts";
import { persistWorkerFailure, type PersistedWorkerFailure, type WorkerFailurePolicyInput } from "./worker-failure-policy.ts";

export type BoundedWorkerRunStatus = "idle" | "completed" | "retry_scheduled" | "dead_lettered";

export type BoundedWorkerRunResult<Output> =
  | {
      status: "idle";
      workerKind: WorkerKind;
    }
  | {
      status: "completed";
      workerKind: WorkerKind;
      claimed: ClaimedWorkerJob;
      output: Output;
      outputSummary: WorkerOutputSummary;
      outputWatermark: WorkerWatermark;
      freshness: WorkerFreshnessRecord;
      completedJob: WorkerJobRecord;
    }
  | ({
      status: "retry_scheduled" | "dead_lettered";
      workerKind: WorkerKind;
      claimed: ClaimedWorkerJob;
    } & PersistedWorkerFailure);

export type RunClaimedWorkerJobInput<Output> = {
  workerKind: WorkerKind;
  jobRepository: WorkerJobRepository;
  workerId: string;
  leaseSeconds?: number;
  now: Date;
  buildOutput: (claimed: ClaimedWorkerJob) => Promise<{
    output: Output;
    outputWatermark: WorkerWatermark;
    outputSummary: WorkerOutputSummary;
  }>;
  writeOutput: (output: Output) => Promise<void>;
  failurePolicy?: WorkerFailurePolicyInput;
  observability?: WorkerObservabilityInput;
};

export async function runClaimedWorkerJob<Output>(
  input: RunClaimedWorkerJobInput<Output>,
): Promise<BoundedWorkerRunResult<Output>> {
  const claimed = await input.jobRepository.claim({
    workerKind: input.workerKind,
    workerId: input.workerId,
    now: input.now,
    leaseSeconds: input.leaseSeconds ?? 60,
  });

  if (!claimed) {
    return { status: "idle", workerKind: input.workerKind };
  }

  const startedAtMs = Date.now();
  recordWorkerJobStarted({ observability: input.observability, claimed, workerId: input.workerId, now: input.now });

  try {
    const { output, outputWatermark, outputSummary } = await input.buildOutput(claimed);
    await input.writeOutput(output);
    const freshness = await input.jobRepository.checkpoint(
      claimed.job.jobId,
      claimed.attempt.attemptId,
      outputWatermark,
      outputSummary,
      input.now,
    );
    recordWorkerJobCheckpointed({ observability: input.observability, claimed });
    const completedJob = await input.jobRepository.complete(
      claimed.job.jobId,
      claimed.attempt.attemptId,
      outputWatermark,
      outputSummary,
      input.now,
    );

    recordWorkerJobCompleted({ observability: input.observability, claimed, durationMs: Date.now() - startedAtMs });

    return {
      status: "completed",
      workerKind: input.workerKind,
      claimed,
      output,
      outputSummary,
      outputWatermark,
      freshness,
      completedJob,
    };
  } catch (error) {
    if (!input.failurePolicy) throw error;
    const failure = await persistWorkerFailure({
      jobRepository: input.jobRepository,
      claimed,
      error,
      now: input.now,
      policy: input.failurePolicy,
    });
    recordWorkerJobFailed({
      observability: input.observability,
      claimed,
      decision: failure.decision,
      durationMs: Date.now() - startedAtMs,
    });
    return {
      status: failure.decision.action === "retry" ? "retry_scheduled" : "dead_lettered",
      workerKind: input.workerKind,
      claimed,
      ...failure,
    };
  }
}

export async function readWorkerResumeWatermark(input: {
  jobRepository: WorkerJobRepository;
  workerKind: WorkerKind;
  tenantScope: ClaimedWorkerJob["job"]["tenantScope"];
  sourceScope: ClaimedWorkerJob["job"]["sourceScope"];
  fallbackWatermark: WorkerWatermark;
}): Promise<WorkerWatermark> {
  const freshness = await input.jobRepository.readFreshness(
    input.workerKind,
    input.tenantScope,
    input.sourceScope,
  );
  return freshness?.committedWatermark ?? input.fallbackWatermark;
}
