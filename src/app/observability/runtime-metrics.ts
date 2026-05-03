import type { RuntimeEnvironment } from "../config/runtime-config.ts";

export type RuntimeMetricName =
  | "data_dyna_http_requests_total"
  | "data_dyna_http_request_duration_ms"
  | "data_dyna_ingestion_events_total"
  | "data_dyna_ingestion_batch_items_total"
  | "data_dyna_ingestion_auth_rejections_total"
  | "data_dyna_ingestion_tenant_policy_failures_total"
  | "data_dyna_runtime_errors_total";

export type RuntimeMetricType = "counter" | "histogram";

export type RuntimeMetricStatusClass = "2xx" | "4xx" | "5xx";

export type RuntimeMetricOutcome =
  | "accepted"
  | "duplicate"
  | "invalid"
  | "unauthorized"
  | "tenant_identity_required"
  | "tenant_mismatch"
  | "error";

export type RuntimeMetricLabels = Partial<{
  route: "/events" | "/events/batch";
  method: string;
  status_class: RuntimeMetricStatusClass;
  outcome: RuntimeMetricOutcome;
  error_code: string;
  source: string;
  producer_service: string;
  producer_environment: string;
  event_domain: string;
  event_name: string;
}>;

export type RuntimeMetricRecord = {
  timestamp: string;
  service: "data-dyna";
  runtime_environment: RuntimeEnvironment;
  name: RuntimeMetricName;
  type: RuntimeMetricType;
  value: number;
  labels: RuntimeMetricLabels;
};

export type RuntimeMetricInput = Omit<RuntimeMetricRecord, "timestamp" | "service" | "runtime_environment" | "labels"> & {
  labels?: RuntimeMetricLabels;
};

export interface RuntimeMetricSink {
  emit(record: RuntimeMetricRecord): void | Promise<void>;
}

const safeMetricLabelValuePattern = /^[A-Za-z0-9._:/=-]{1,128}$/;
const allowedMetricLabelKeys = [
  "route",
  "method",
  "status_class",
  "outcome",
  "error_code",
  "source",
  "producer_service",
  "producer_environment",
  "event_domain",
  "event_name",
] as const;

export function httpStatusClass(status: number): RuntimeMetricStatusClass {
  if (status >= 500) {
    return "5xx";
  }

  if (status >= 400) {
    return "4xx";
  }

  return "2xx";
}

export function emitRuntimeMetric(
  sink: RuntimeMetricSink | undefined,
  runtimeEnvironment: RuntimeEnvironment,
  input: RuntimeMetricInput,
): void {
  if (!sink) {
    return;
  }

  const record: RuntimeMetricRecord = {
    timestamp: new Date().toISOString(),
    service: "data-dyna",
    runtime_environment: runtimeEnvironment,
    name: input.name,
    type: input.type,
    value: input.value,
    labels: sanitizeMetricLabels(input.labels ?? {}),
  };

  try {
    void Promise.resolve(sink.emit(record)).catch(() => undefined);
  } catch {
    // Observability sinks must not change request behavior.
  }
}

export function incrementRuntimeCounter(
  sink: RuntimeMetricSink | undefined,
  runtimeEnvironment: RuntimeEnvironment,
  name: Extract<RuntimeMetricName, `${string}_total`>,
  labels: RuntimeMetricLabels,
  value = 1,
): void {
  emitRuntimeMetric(sink, runtimeEnvironment, {
    name,
    type: "counter",
    value,
    labels,
  });
}

export function observeRuntimeDuration(
  sink: RuntimeMetricSink | undefined,
  runtimeEnvironment: RuntimeEnvironment,
  name: "data_dyna_http_request_duration_ms",
  value: number,
  labels: RuntimeMetricLabels,
): void {
  emitRuntimeMetric(sink, runtimeEnvironment, {
    name,
    type: "histogram",
    value,
    labels,
  });
}

export class InMemoryRuntimeMetricSink implements RuntimeMetricSink {
  readonly records: RuntimeMetricRecord[] = [];

  emit(record: RuntimeMetricRecord): void {
    this.records.push(record);
  }

  sum(name: RuntimeMetricName, labels: RuntimeMetricLabels = {}): number {
    return this.records
      .filter((record) => record.name === name && labelsMatch(record.labels, labels))
      .reduce((total, record) => total + record.value, 0);
  }
}

function sanitizeMetricLabels(labels: RuntimeMetricLabels): RuntimeMetricLabels {
  const safeLabels: RuntimeMetricLabels = {};

  for (const key of allowedMetricLabelKeys) {
    const value = labels[key];
    if (typeof value !== "string" || value.length === 0) {
      continue;
    }

    if (safeMetricLabelValuePattern.test(value)) {
      (safeLabels as Record<string, string>)[key] = value;
    }
  }

  return safeLabels;
}

function labelsMatch(actual: RuntimeMetricLabels, expected: RuntimeMetricLabels): boolean {
  return Object.entries(expected).every(([key, value]) => actual[key as keyof RuntimeMetricLabels] === value);
}
