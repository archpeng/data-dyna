import type {
  ClaimedWorkerJob,
  WorkerFailureClass,
  WorkerJobRecord,
  WorkerJobRepository,
  WorkerSafeDiagnostic,
} from "./durable-worker-job-repository.ts";

export type WorkerFailureReasonCode =
  | "storage_unavailable"
  | "runtime_exception"
  | "contract_violation"
  | "tenant_policy_rejected"
  | "idempotency_conflict"
  | "unexpected_worker_failure";

export type WorkerFailurePolicyInput = {
  retryBaseDelaySeconds?: number;
  retryMaxDelaySeconds?: number;
  nextOperatorAction?: string;
};

export type WorkerFailureDecision = {
  action: "retry" | "dead_letter";
  failureClass: WorkerFailureClass;
  reasonCode: WorkerFailureReasonCode;
  safeDiagnostic: WorkerSafeDiagnostic;
  nextRunAt?: Date;
  nextOperatorAction?: string;
};

export type PersistedWorkerFailure = {
  decision: WorkerFailureDecision;
  failedJob: WorkerJobRecord;
};

export class WorkerExecutionError extends Error {
  readonly failureClass: WorkerFailureClass;
  readonly reasonCode: WorkerFailureReasonCode;
  readonly retryable: boolean;
  readonly safeDiagnostic: WorkerSafeDiagnostic;

  constructor(
    message: string,
    input: {
      failureClass: WorkerFailureClass;
      reasonCode: WorkerFailureReasonCode;
      retryable?: boolean;
      safeDiagnostic?: WorkerSafeDiagnostic;
      cause?: unknown;
    },
  ) {
    super(message, { cause: input.cause });
    this.name = "WorkerExecutionError";
    this.failureClass = input.failureClass;
    this.reasonCode = input.reasonCode;
    this.retryable = input.retryable ?? defaultRetryable(input.failureClass);
    this.safeDiagnostic = input.safeDiagnostic ?? {};
  }
}

export async function persistWorkerFailure(input: {
  jobRepository: WorkerJobRepository;
  claimed: ClaimedWorkerJob;
  error: unknown;
  now: Date;
  policy?: WorkerFailurePolicyInput;
}): Promise<PersistedWorkerFailure> {
  const decision = classifyWorkerFailure(input);
  const failedJob =
    decision.action === "retry"
      ? await input.jobRepository.retry(
          input.claimed.job.jobId,
          input.claimed.attempt.attemptId,
          decision.failureClass,
          decision.nextRunAt ?? input.now,
          decision.safeDiagnostic,
          input.now,
        )
      : await input.jobRepository.deadLetter(
          input.claimed.job.jobId,
          input.claimed.attempt.attemptId,
          decision.failureClass,
          decision.reasonCode,
          decision.safeDiagnostic,
          decision.nextOperatorAction ?? "inspect_safe_diagnostic_and_replay_after_fix",
          input.now,
        );

  return { decision, failedJob };
}

export function classifyWorkerFailure(input: {
  claimed: ClaimedWorkerJob;
  error: unknown;
  now: Date;
  policy?: WorkerFailurePolicyInput;
}): WorkerFailureDecision {
  const metadata = workerFailureMetadata(input.error);
  const retryable = metadata.retryable && input.claimed.job.attemptCount < input.claimed.job.maxAttempts;
  const safeDiagnostic = buildSafeDiagnostic({
    claimed: input.claimed,
    error: input.error,
    metadata,
    action: retryable ? "retry" : "dead_letter",
  });

  if (retryable) {
    return {
      action: "retry",
      failureClass: metadata.failureClass,
      reasonCode: metadata.reasonCode,
      safeDiagnostic,
      nextRunAt: retryBackoffAt(input.claimed, input.now, input.policy),
    };
  }

  return {
    action: "dead_letter",
    failureClass: metadata.failureClass,
    reasonCode: metadata.reasonCode,
    safeDiagnostic,
    nextOperatorAction: input.policy?.nextOperatorAction ?? "inspect_safe_diagnostic_and_replay_after_fix",
  };
}

function workerFailureMetadata(error: unknown): {
  failureClass: WorkerFailureClass;
  reasonCode: WorkerFailureReasonCode;
  retryable: boolean;
  errorName: string;
  errorMessage: string;
} {
  if (error instanceof WorkerExecutionError) {
    return {
      failureClass: error.failureClass,
      reasonCode: error.reasonCode,
      retryable: error.retryable,
      errorName: error.name,
      errorMessage: error.message,
    };
  }

  const errorName = error instanceof Error ? error.name : typeof error;
  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    failureClass: "unexpected",
    reasonCode: "unexpected_worker_failure",
    retryable: defaultRetryable("unexpected"),
    errorName,
    errorMessage,
  };
}

function defaultRetryable(failureClass: WorkerFailureClass): boolean {
  return failureClass === "transient_storage" || failureClass === "transient_runtime" || failureClass === "unexpected";
}

function retryBackoffAt(claimed: ClaimedWorkerJob, now: Date, policy?: WorkerFailurePolicyInput): Date {
  const baseSeconds = Math.max(1, policy?.retryBaseDelaySeconds ?? 30);
  const maxSeconds = Math.max(baseSeconds, policy?.retryMaxDelaySeconds ?? 300);
  const exponent = Math.max(0, claimed.job.attemptCount - 1);
  const delaySeconds = Math.min(maxSeconds, baseSeconds * 2 ** exponent);
  return new Date(now.getTime() + delaySeconds * 1000);
}

function buildSafeDiagnostic(input: {
  claimed: ClaimedWorkerJob;
  error: unknown;
  metadata: ReturnType<typeof workerFailureMetadata>;
  action: WorkerFailureDecision["action"];
}): WorkerSafeDiagnostic {
  const unsafeDiagnostic = input.error instanceof WorkerExecutionError ? input.error.safeDiagnostic : {};
  return {
    workerKind: input.claimed.job.workerKind,
    jobId: input.claimed.job.jobId,
    attemptId: input.claimed.attempt.attemptId,
    attemptCount: input.claimed.job.attemptCount,
    maxAttempts: input.claimed.job.maxAttempts,
    action: input.action,
    failureClass: input.metadata.failureClass,
    reasonCode: input.metadata.reasonCode,
    errorName: safeText(input.metadata.errorName),
    errorMessage: safeText(input.metadata.errorMessage),
    detail: sanitizeDiagnostic(unsafeDiagnostic),
  };
}

function sanitizeDiagnostic(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[redacted-depth]";
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return safeText(value);
  if (Array.isArray(value)) return value.slice(0, 10).map((entry) => sanitizeDiagnostic(entry, depth + 1));
  if (typeof value !== "object") return safeText(String(value));

  const sanitized: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    sanitized[key] = forbiddenDiagnosticKey(key) ? "[redacted]" : sanitizeDiagnostic(nested, depth + 1);
  }
  return sanitized;
}

function forbiddenDiagnosticKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return [
    "authorization",
    "bearer",
    "token",
    "secret",
    "password",
    "credential",
    "idempotency",
    "payment",
    "card",
    "customer",
    "phone",
    "email",
    "address",
    "payload",
    "raw",
    "body",
    "merchantnote",
    "merchantsecret",
  ].some((forbidden) => normalized.includes(forbidden));
}

function safeText(value: string): string {
  return truncate(
    value
      .replace(/bearer\s+[^\s,;]+/gi, "bearer [redacted]")
      .replace(/\b(token|secret|password|credential|idempotency\w*|payment\w*|customer\w*|card\w*)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
      .replace(/\b\d{13,19}\b/g, "[redacted-number]")
      .replace(/\+?\d{10,15}\b/g, "[redacted-number]"),
  );
}

function truncate(value: string): string {
  return value.length > 240 ? `${value.slice(0, 237)}...` : value;
}
