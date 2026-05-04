import { randomUUID } from "node:crypto";
import type { RuntimeEnvironment } from "../config/runtime-config.ts";

export type RuntimeLogLevel = "info" | "warn" | "error";

export type RuntimeLogEvent =
  | "runtime.request.completed"
  | "ingestion.auth.rejected"
  | "ingestion.event.accepted"
  | "ingestion.event.duplicate"
  | "ingestion.event.invalid"
  | "ingestion.event.tenant_policy_rejected"
  | "ingestion.batch.completed"
  | "worker.job.started"
  | "worker.job.checkpointed"
  | "worker.job.completed"
  | "worker.job.failed"
  | "worker.job.retry_scheduled"
  | "worker.job.dead_lettered";

export type RuntimeLogOutcome =
  | "accepted"
  | "duplicate"
  | "invalid"
  | "unauthorized"
  | "tenant_identity_required"
  | "tenant_mismatch"
  | "started"
  | "checkpointed"
  | "completed"
  | "failed"
  | "retry_scheduled"
  | "dead_lettered"
  | "error";

export type RuntimeLogRecord = {
  timestamp: string;
  level: RuntimeLogLevel;
  service: "data-dyna";
  runtime_environment: RuntimeEnvironment;
  event: RuntimeLogEvent;
  request_id?: string;
  correlation_id?: string;
  route?: string;
  method?: string;
  status?: number;
  duration_ms?: number;
  outcome?: RuntimeLogOutcome;
  error_code?: string;
  credential_id?: string;
  merchant_id?: string;
  store_id?: string;
  source?: string;
  producer_service?: string;
  producer_environment?: string;
  event_domain?: string;
  event_name?: string;
  batch_size?: number;
  accepted_count?: number;
  duplicate_count?: number;
  invalid_count?: number;
  tenant_policy_failure_count?: number;
  worker_kind?: string;
  worker_id?: string;
  job_id?: string;
  attempt_id?: number;
  attempt_count?: number;
  max_attempts?: number;
  failure_class?: string;
  reason_code?: string;
  next_action?: string;
  lag_ms?: number;
};

export type RuntimeLogInput = Omit<RuntimeLogRecord, "timestamp" | "service" | "runtime_environment">;

export interface RuntimeLogSink {
  emit(record: RuntimeLogRecord): void | Promise<void>;
}

export type RequestObservabilityContext = {
  requestId: string;
  correlationId: string;
};

const safeObservabilityIdPattern = /^[A-Za-z0-9._:/=-]{1,128}$/;

export function createRequestObservabilityContext(headers: {
  "x-request-id"?: string | string[];
  "x-correlation-id"?: string | string[];
}): RequestObservabilityContext {
  const requestId = safeObservabilityId(headers["x-request-id"]) ?? randomUUID();
  return {
    requestId,
    correlationId: safeObservabilityId(headers["x-correlation-id"]) ?? requestId,
  };
}

export function safeObservabilityId(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    if (value.length !== 1) {
      return undefined;
    }

    return safeObservabilityId(value[0]);
  }

  const trimmed = value?.trim();
  if (!trimmed || !safeObservabilityIdPattern.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}

export function emitRuntimeLog(
  sink: RuntimeLogSink | undefined,
  runtimeEnvironment: RuntimeEnvironment,
  input: RuntimeLogInput,
): void {
  if (!sink) {
    return;
  }

  const record: RuntimeLogRecord = {
    timestamp: new Date().toISOString(),
    service: "data-dyna",
    runtime_environment: runtimeEnvironment,
    ...input,
  };

  try {
    void Promise.resolve(sink.emit(record)).catch(() => undefined);
  } catch {
    // Observability sinks must not change request behavior.
  }
}

export class InMemoryRuntimeLogSink implements RuntimeLogSink {
  readonly records: RuntimeLogRecord[] = [];

  emit(record: RuntimeLogRecord): void {
    this.records.push(record);
  }
}
