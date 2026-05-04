import type { RuntimeEnvironment } from "../config/runtime-config.ts";
import { emitRuntimeLog, type RuntimeLogSink } from "../observability/runtime-log.ts";
import {
  incrementRuntimeCounter,
  observeRuntimeDuration,
  type RuntimeMetricLabels,
  type RuntimeMetricSink,
} from "../observability/runtime-metrics.ts";
import type { ClaimedWorkerJob, WorkerFailureClass } from "./durable-worker-job-repository.ts";
import type { WorkerFailureDecision } from "./worker-failure-policy.ts";

export type WorkerObservabilityInput = {
  runtimeEnvironment: RuntimeEnvironment;
  logSink?: RuntimeLogSink;
  metricSink?: RuntimeMetricSink;
};

export function recordWorkerJobStarted(input: {
  observability?: WorkerObservabilityInput;
  claimed: ClaimedWorkerJob;
  workerId: string;
  now: Date;
}): void {
  const lagMs = workerLagMs(input.claimed, input.now);
  emitWorkerLog(input.observability, input.claimed, "worker.job.started", "started", {
    worker_id: input.workerId,
    lag_ms: lagMs,
  });
  incrementWorkerJobCounter(input.observability, input.claimed, "started");
  observeWorkerLag(input.observability, input.claimed, lagMs);
}

export function recordWorkerJobCheckpointed(input: {
  observability?: WorkerObservabilityInput;
  claimed: ClaimedWorkerJob;
}): void {
  emitWorkerLog(input.observability, input.claimed, "worker.job.checkpointed", "checkpointed");
  incrementRuntimeCounter(
    input.observability?.metricSink,
    input.observability?.runtimeEnvironment ?? "test",
    "data_dyna_worker_checkpoints_total",
    workerMetricLabels(input.claimed, "checkpointed"),
  );
}

export function recordWorkerJobCompleted(input: {
  observability?: WorkerObservabilityInput;
  claimed: ClaimedWorkerJob;
  durationMs: number;
}): void {
  emitWorkerLog(input.observability, input.claimed, "worker.job.completed", "completed");
  incrementWorkerJobCounter(input.observability, input.claimed, "completed");
  observeWorkerDuration(input.observability, input.claimed, input.durationMs);
}

export function recordWorkerJobFailed(input: {
  observability?: WorkerObservabilityInput;
  claimed: ClaimedWorkerJob;
  decision: WorkerFailureDecision;
  durationMs: number;
}): void {
  emitWorkerLog(input.observability, input.claimed, "worker.job.failed", "failed", failureLogFields(input.decision));
  incrementWorkerJobCounter(input.observability, input.claimed, "failed", input.decision);
  observeWorkerDuration(input.observability, input.claimed, input.durationMs, input.decision);

  const event = input.decision.action === "retry" ? "worker.job.retry_scheduled" : "worker.job.dead_lettered";
  const outcome = input.decision.action === "retry" ? "retry_scheduled" : "dead_lettered";
  emitWorkerLog(input.observability, input.claimed, event, outcome, failureLogFields(input.decision));
  incrementWorkerJobCounter(input.observability, input.claimed, outcome, input.decision);
}

function emitWorkerLog(
  observability: WorkerObservabilityInput | undefined,
  claimed: ClaimedWorkerJob,
  event: Parameters<typeof emitRuntimeLog>[2]["event"],
  outcome: Parameters<typeof emitRuntimeLog>[2]["outcome"],
  extra: Record<string, unknown> = {},
): void {
  emitRuntimeLog(observability?.logSink, observability?.runtimeEnvironment ?? "test", {
    level: event === "worker.job.failed" || event === "worker.job.dead_lettered" ? "warn" : "info",
    event,
    outcome,
    correlation_id: claimed.job.correlationId,
    merchant_id: claimed.job.tenantScope.merchantId ?? undefined,
    store_id: claimed.job.tenantScope.storeId ?? undefined,
    source: claimed.job.sourceScope.source,
    producer_service: claimed.job.sourceScope.producerService ?? undefined,
    producer_environment: claimed.job.sourceScope.producerEnvironment ?? undefined,
    worker_kind: claimed.job.workerKind,
    job_id: claimed.job.jobId,
    attempt_id: claimed.attempt.attemptId,
    attempt_count: claimed.job.attemptCount,
    max_attempts: claimed.job.maxAttempts,
    ...extra,
  });
}

function incrementWorkerJobCounter(
  observability: WorkerObservabilityInput | undefined,
  claimed: ClaimedWorkerJob,
  outcome: NonNullable<RuntimeMetricLabels["outcome"]>,
  decision?: WorkerFailureDecision,
): void {
  incrementRuntimeCounter(observability?.metricSink, observability?.runtimeEnvironment ?? "test", "data_dyna_worker_jobs_total", workerMetricLabels(claimed, outcome, decision));
}

function observeWorkerDuration(
  observability: WorkerObservabilityInput | undefined,
  claimed: ClaimedWorkerJob,
  durationMs: number,
  decision?: WorkerFailureDecision,
): void {
  observeRuntimeDuration(observability?.metricSink, observability?.runtimeEnvironment ?? "test", "data_dyna_worker_duration_ms", durationMs, workerMetricLabels(claimed, decision ? "failed" : "completed", decision));
}

function observeWorkerLag(
  observability: WorkerObservabilityInput | undefined,
  claimed: ClaimedWorkerJob,
  lagMs: number,
): void {
  observeRuntimeDuration(observability?.metricSink, observability?.runtimeEnvironment ?? "test", "data_dyna_worker_lag_ms", lagMs, workerMetricLabels(claimed, "started"));
}

function workerMetricLabels(
  claimed: ClaimedWorkerJob,
  outcome: NonNullable<RuntimeMetricLabels["outcome"]>,
  decision?: WorkerFailureDecision,
): RuntimeMetricLabels {
  return {
    outcome,
    source: claimed.job.sourceScope.source,
    producer_service: claimed.job.sourceScope.producerService ?? undefined,
    producer_environment: claimed.job.sourceScope.producerEnvironment ?? undefined,
    worker_kind: claimed.job.workerKind,
    failure_class: decision?.failureClass,
    reason_code: decision?.reasonCode,
  };
}

function failureLogFields(decision: WorkerFailureDecision): {
  failure_class: WorkerFailureClass;
  reason_code: string;
  next_action: string;
} {
  return {
    failure_class: decision.failureClass,
    reason_code: decision.reasonCode,
    next_action: decision.action === "retry" ? "retry_after_backoff" : (decision.nextOperatorAction ?? "inspect_safe_diagnostic_and_replay_after_fix"),
  };
}

function workerLagMs(claimed: ClaimedWorkerJob, now: Date): number {
  return Math.max(0, now.getTime() - new Date(claimed.job.nextRunAt).getTime());
}
