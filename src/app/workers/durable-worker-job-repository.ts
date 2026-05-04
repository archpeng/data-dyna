import { createHash } from "node:crypto";
import type { WorkerKind } from "./worker-contract.ts";

export type WorkerJobStatus =
  | "queued"
  | "claimed"
  | "running"
  | "succeeded"
  | "retry_scheduled"
  | "dead_lettered"
  | "cancelled_by_operator";

export type WorkerFailureClass =
  | "transient_storage"
  | "transient_runtime"
  | "contract_violation"
  | "tenant_policy"
  | "idempotency_conflict"
  | "unexpected";

export type WorkerTenantScope = {
  brandId?: string | null;
  merchantId?: string | null;
  storeId?: string | null;
};

export type WorkerSourceScope = {
  source: string;
  producerService?: string | null;
  producerEnvironment?: string | null;
};

export type WorkerWatermark = Record<string, unknown>;
export type WorkerSafeDiagnostic = Record<string, unknown>;
export type WorkerOutputSummary = Record<string, unknown>;

export type WorkerJobRecord = {
  jobId: string;
  workerKind: WorkerKind;
  status: WorkerJobStatus;
  tenantScope: WorkerTenantScope;
  sourceScope: WorkerSourceScope;
  inputWatermark: WorkerWatermark;
  idempotencyIdentity: string;
  correlationId: string;
  attemptCount: number;
  maxAttempts: number;
  lockedBy?: string;
  lockedUntil?: string;
  heartbeatAt?: string;
  nextRunAt: string;
  startedAt?: string;
  completedAt?: string;
  lastErrorClass?: WorkerFailureClass;
  lastErrorReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkerJobAttemptRecord = {
  attemptId: number;
  jobId: string;
  attemptNumber: number;
  workerKind: WorkerKind;
  claimedBy: string;
  status: "started" | "checkpointed" | "succeeded" | "retryable_failed" | "terminal_failed" | "dead_lettered";
  inputWatermark: WorkerWatermark;
  outputWatermark?: WorkerWatermark;
  failureClass?: WorkerFailureClass;
  safeDiagnostic: WorkerSafeDiagnostic;
  startedAt: string;
  heartbeatAt?: string;
  finishedAt?: string;
};

export type ClaimedWorkerJob = {
  job: WorkerJobRecord;
  attempt: WorkerJobAttemptRecord;
};

export type WorkerFreshnessRecord = {
  checkpointId: string;
  workerKind: WorkerKind;
  tenantScope: WorkerTenantScope;
  sourceScope: WorkerSourceScope;
  committedWatermark: WorkerWatermark;
  committedJobId: string;
  committedAttemptId: number;
  outputSummary: WorkerOutputSummary;
  committedAt: string;
  updatedAt: string;
};

export type EnqueueWorkerJobInput = {
  workerKind: WorkerKind;
  tenantScope: WorkerTenantScope;
  sourceScope: WorkerSourceScope;
  inputWatermark: WorkerWatermark;
  idempotencyIdentity: string;
  correlationId: string;
  maxAttempts?: number;
  now?: Date;
};

export type ClaimWorkerJobInput = {
  workerKind: WorkerKind;
  workerId: string;
  now: Date;
  leaseSeconds: number;
};

export type WorkerJobRepository = {
  enqueue(input: EnqueueWorkerJobInput): Promise<{ job: WorkerJobRecord; duplicate: boolean }>;
  claim(input: ClaimWorkerJobInput): Promise<ClaimedWorkerJob | undefined>;
  heartbeat(jobId: string, attemptId: number, now: Date): Promise<ClaimedWorkerJob | undefined>;
  checkpoint(jobId: string, attemptId: number, outputWatermark: WorkerWatermark, outputSummary: WorkerOutputSummary, now: Date): Promise<WorkerFreshnessRecord>;
  complete(jobId: string, attemptId: number, finalWatermark: WorkerWatermark, outputSummary: WorkerOutputSummary, now: Date): Promise<WorkerJobRecord>;
  retry(jobId: string, attemptId: number, failureClass: WorkerFailureClass, nextRunAt: Date, safeDiagnostic: WorkerSafeDiagnostic, now: Date): Promise<WorkerJobRecord>;
  deadLetter(jobId: string, attemptId: number, failureClass: WorkerFailureClass, reasonCode: string, safeDiagnostic: WorkerSafeDiagnostic, nextOperatorAction: string, now: Date): Promise<WorkerJobRecord>;
  readFreshness(workerKind: WorkerKind, tenantScope: WorkerTenantScope, sourceScope: WorkerSourceScope): Promise<WorkerFreshnessRecord | undefined>;
};

export type PostgresQueryResult<Row extends Record<string, unknown>> = {
  rows: Row[];
};

export type PostgresWorkerJobClient = {
  query<Row extends Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<PostgresQueryResult<Row>>;
};

type WorkerJobRow = {
  job_id: string;
  worker_kind: WorkerKind;
  status: WorkerJobStatus;
  brand_id: string | null;
  merchant_id: string | null;
  store_id: string | null;
  source: string;
  producer_service: string | null;
  producer_environment: string | null;
  input_watermark: WorkerWatermark;
  idempotency_identity: string;
  correlation_id: string;
  attempt_count: number;
  max_attempts: number;
  locked_by: string | null;
  locked_until: Date | string | null;
  heartbeat_at: Date | string | null;
  next_run_at: Date | string;
  started_at: Date | string | null;
  completed_at: Date | string | null;
  last_error_class: WorkerFailureClass | null;
  last_error_reason: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type WorkerAttemptRow = {
  attempt_id: number | string;
  job_id: string;
  attempt_number: number;
  worker_kind: WorkerKind;
  claimed_by: string;
  attempt_status: WorkerJobAttemptRecord["status"];
  attempt_input_watermark: WorkerWatermark;
  output_watermark: WorkerWatermark | null;
  failure_class: WorkerFailureClass | null;
  safe_diagnostic: WorkerSafeDiagnostic;
  attempt_started_at: Date | string;
  attempt_heartbeat_at: Date | string | null;
  finished_at: Date | string | null;
};

type ClaimedWorkerRow = WorkerJobRow & WorkerAttemptRow;

type WorkerFreshnessRow = {
  checkpoint_id: string;
  worker_kind: WorkerKind;
  brand_id: string | null;
  merchant_id: string | null;
  store_id: string | null;
  source: string;
  producer_service: string | null;
  producer_environment: string | null;
  committed_watermark: WorkerWatermark;
  committed_job_id: string;
  committed_attempt_id: number | string;
  output_summary: WorkerOutputSummary;
  committed_at: Date | string;
  updated_at: Date | string;
};

const workerJobColumns = `
  job_id,
  worker_kind,
  status,
  brand_id,
  merchant_id,
  store_id,
  source,
  producer_service,
  producer_environment,
  input_watermark,
  idempotency_identity,
  correlation_id,
  attempt_count,
  max_attempts,
  locked_by,
  locked_until,
  heartbeat_at,
  next_run_at,
  started_at,
  completed_at,
  last_error_class,
  last_error_reason,
  created_at,
  updated_at
`;

const workerJobReturningColumns = `
  worker_jobs.job_id,
  worker_jobs.worker_kind,
  worker_jobs.status,
  worker_jobs.brand_id,
  worker_jobs.merchant_id,
  worker_jobs.store_id,
  worker_jobs.source,
  worker_jobs.producer_service,
  worker_jobs.producer_environment,
  worker_jobs.input_watermark,
  worker_jobs.idempotency_identity,
  worker_jobs.correlation_id,
  worker_jobs.attempt_count,
  worker_jobs.max_attempts,
  worker_jobs.locked_by,
  worker_jobs.locked_until,
  worker_jobs.heartbeat_at,
  worker_jobs.next_run_at,
  worker_jobs.started_at,
  worker_jobs.completed_at,
  worker_jobs.last_error_class,
  worker_jobs.last_error_reason,
  worker_jobs.created_at,
  worker_jobs.updated_at
`;

const workerAttemptColumns = `
  attempt_id,
  job_id,
  attempt_number,
  worker_kind,
  claimed_by,
  status AS attempt_status,
  input_watermark AS attempt_input_watermark,
  output_watermark,
  failure_class,
  safe_diagnostic,
  started_at AS attempt_started_at,
  heartbeat_at AS attempt_heartbeat_at,
  finished_at
`;

export class PostgresWorkerJobRepository implements WorkerJobRepository {
  constructor(private readonly client: PostgresWorkerJobClient) {}

  async enqueue(input: EnqueueWorkerJobInput): Promise<{ job: WorkerJobRecord; duplicate: boolean }> {
    const now = input.now ?? new Date();
    const jobId = stableWorkerJobId(input);
    const inserted = await this.client.query<WorkerJobRow & { inserted: boolean }>(
      `WITH inserted AS (
         INSERT INTO worker_jobs (
           job_id,
           worker_kind,
           status,
           brand_id,
           merchant_id,
           store_id,
           source,
           producer_service,
           producer_environment,
           input_watermark,
           idempotency_identity,
           correlation_id,
           max_attempts,
           next_run_at,
           created_at,
           updated_at
         ) VALUES (
           $1,
           $2,
           'queued',
           $3,
           $4,
           $5,
           $6,
           $7,
           $8,
           $9::jsonb,
           $10,
           $11,
           $12,
           $13,
           $13,
           $13
         )
         ON CONFLICT (job_id) DO NOTHING
         RETURNING ${workerJobColumns}, TRUE AS inserted
       )
       SELECT ${workerJobColumns}, inserted FROM inserted
       UNION ALL
       SELECT ${workerJobColumns}, FALSE AS inserted
         FROM worker_jobs
        WHERE job_id = $1
          AND NOT EXISTS (SELECT 1 FROM inserted)
        LIMIT 1`,
      [
        jobId,
        input.workerKind,
        input.tenantScope.brandId ?? null,
        input.tenantScope.merchantId ?? null,
        input.tenantScope.storeId ?? null,
        input.sourceScope.source,
        input.sourceScope.producerService ?? null,
        input.sourceScope.producerEnvironment ?? null,
        stringifyJsonb(input.inputWatermark, "worker input watermark"),
        input.idempotencyIdentity,
        input.correlationId,
        input.maxAttempts ?? 3,
        now,
      ],
    );

    const row = inserted.rows[0];
    if (!row) {
      throw new Error("Worker job enqueue did not return a row.");
    }

    return { job: toWorkerJobRecord(row), duplicate: !row.inserted };
  }

  async claim(input: ClaimWorkerJobInput): Promise<ClaimedWorkerJob | undefined> {
    const lockedUntil = new Date(input.now.getTime() + input.leaseSeconds * 1000);
    const claimed = await this.client.query<ClaimedWorkerRow>(
      `WITH selected AS (
         SELECT job_id
           FROM worker_jobs
          WHERE worker_kind = $1
            AND status IN ('queued', 'retry_scheduled')
            AND next_run_at <= $2
            AND (locked_until IS NULL OR locked_until <= $2)
            AND attempt_count < max_attempts
          ORDER BY next_run_at ASC, created_at ASC, job_id ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
       ), updated AS (
         UPDATE worker_jobs
            SET status = 'running',
                locked_by = $3,
                locked_until = $4,
                heartbeat_at = $2,
                started_at = COALESCE(started_at, $2),
                attempt_count = attempt_count + 1,
                updated_at = $2
           FROM selected
          WHERE worker_jobs.job_id = selected.job_id
          RETURNING worker_jobs.*
       ), attempt AS (
         INSERT INTO worker_job_attempts (
           job_id,
           attempt_number,
           worker_kind,
           claimed_by,
           status,
           input_watermark,
           started_at,
           heartbeat_at
         )
         SELECT job_id,
                attempt_count,
                worker_kind,
                $3,
                'started',
                input_watermark,
                $2,
                $2
           FROM updated
         RETURNING ${workerAttemptColumns}
       )
       SELECT updated.*, attempt.*
         FROM updated
         JOIN attempt ON attempt.job_id = updated.job_id`,
      [input.workerKind, input.now, input.workerId, lockedUntil],
    );

    const row = claimed.rows[0];
    return row ? toClaimedWorkerJob(row) : undefined;
  }

  async heartbeat(jobId: string, attemptId: number, now: Date): Promise<ClaimedWorkerJob | undefined> {
    const heartbeat = await this.client.query<ClaimedWorkerRow>(
      `WITH updated_job AS (
         UPDATE worker_jobs
            SET heartbeat_at = $3,
                updated_at = $3
          WHERE job_id = $1
            AND status = 'running'
          RETURNING *
       ), updated_attempt AS (
         UPDATE worker_job_attempts
            SET heartbeat_at = $3
          WHERE attempt_id = $2
            AND job_id = $1
          RETURNING ${workerAttemptColumns}
       )
       SELECT updated_job.*, updated_attempt.*
         FROM updated_job
         JOIN updated_attempt ON updated_attempt.job_id = updated_job.job_id`,
      [jobId, attemptId, now],
    );

    const row = heartbeat.rows[0];
    return row ? toClaimedWorkerJob(row) : undefined;
  }

  async checkpoint(
    jobId: string,
    attemptId: number,
    outputWatermark: WorkerWatermark,
    outputSummary: WorkerOutputSummary,
    now: Date,
  ): Promise<WorkerFreshnessRecord> {
    const checkpoint = await this.client.query<WorkerFreshnessRow>(
      `WITH job AS (
         SELECT * FROM worker_jobs WHERE job_id = $1
       ), attempt AS (
         UPDATE worker_job_attempts
            SET status = 'checkpointed',
                output_watermark = $3::jsonb,
                heartbeat_at = $5
          WHERE attempt_id = $2
            AND job_id = $1
          RETURNING *
       ), upserted AS (
         INSERT INTO worker_checkpoints (
           checkpoint_id,
           worker_kind,
           brand_id,
           merchant_id,
           store_id,
           source,
           producer_service,
           producer_environment,
           committed_watermark,
           committed_job_id,
           committed_attempt_id,
           output_summary,
           committed_at,
           updated_at
         )
         SELECT 'worker_checkpoint:' || md5(concat_ws('|', job.worker_kind, COALESCE(job.merchant_id, ''), COALESCE(job.store_id, ''), job.source, COALESCE(job.producer_service, ''), COALESCE(job.producer_environment, ''))),
                job.worker_kind,
                job.brand_id,
                job.merchant_id,
                job.store_id,
                job.source,
                job.producer_service,
                job.producer_environment,
                $3::jsonb,
                job.job_id,
                attempt.attempt_id,
                $4::jsonb,
                $5,
                $5
           FROM job
           JOIN attempt ON attempt.job_id = job.job_id
         ON CONFLICT (checkpoint_id) DO UPDATE
              SET committed_watermark = EXCLUDED.committed_watermark,
                  committed_job_id = EXCLUDED.committed_job_id,
                  committed_attempt_id = EXCLUDED.committed_attempt_id,
                  output_summary = EXCLUDED.output_summary,
                  committed_at = EXCLUDED.committed_at,
                  updated_at = EXCLUDED.updated_at
         RETURNING *
       )
       SELECT * FROM upserted`,
      [
        jobId,
        attemptId,
        stringifyJsonb(outputWatermark, "worker output watermark"),
        stringifyJsonb(outputSummary, "worker output summary"),
        now,
      ],
    );

    const row = checkpoint.rows[0];
    if (!row) {
      throw new Error("Worker checkpoint did not return a row.");
    }

    return toWorkerFreshnessRecord(row);
  }

  async complete(
    jobId: string,
    attemptId: number,
    finalWatermark: WorkerWatermark,
    outputSummary: WorkerOutputSummary,
    now: Date,
  ): Promise<WorkerJobRecord> {
    await this.checkpoint(jobId, attemptId, finalWatermark, outputSummary, now);
    const completed = await this.client.query<WorkerJobRow>(
      `WITH attempt AS (
         UPDATE worker_job_attempts
            SET status = 'succeeded',
                output_watermark = $3::jsonb,
                finished_at = $4
          WHERE attempt_id = $2
            AND job_id = $1
          RETURNING job_id
       )
       UPDATE worker_jobs
          SET status = 'succeeded',
              locked_by = NULL,
              locked_until = NULL,
              completed_at = $4,
              updated_at = $4
         FROM attempt
        WHERE worker_jobs.job_id = attempt.job_id
       RETURNING ${workerJobReturningColumns}`,
      [
        jobId,
        attemptId,
        stringifyJsonb(finalWatermark, "worker final watermark"),
        now,
      ],
    );

    const row = completed.rows[0];
    if (!row) {
      throw new Error("Worker completion did not return a row.");
    }

    return toWorkerJobRecord(row);
  }

  async retry(
    jobId: string,
    attemptId: number,
    failureClass: WorkerFailureClass,
    nextRunAt: Date,
    safeDiagnostic: WorkerSafeDiagnostic,
    now: Date,
  ): Promise<WorkerJobRecord> {
    const retried = await this.client.query<WorkerJobRow>(
      `WITH job AS (
         SELECT * FROM worker_jobs
          WHERE job_id = $1
            AND attempt_count < max_attempts
       ), attempt AS (
         UPDATE worker_job_attempts
            SET status = 'retryable_failed',
                failure_class = $3,
                safe_diagnostic = $5::jsonb,
                finished_at = $6
          WHERE attempt_id = $2
            AND job_id = $1
            AND EXISTS (SELECT 1 FROM job)
          RETURNING job_id
       )
       UPDATE worker_jobs
          SET status = 'retry_scheduled',
              locked_by = NULL,
              locked_until = NULL,
              next_run_at = $4,
              last_error_class = $3,
              last_error_reason = $7,
              updated_at = $6
         FROM attempt
        WHERE worker_jobs.job_id = attempt.job_id
       RETURNING ${workerJobReturningColumns}`,
      [
        jobId,
        attemptId,
        failureClass,
        nextRunAt,
        stringifyJsonb(safeDiagnostic, "worker retry diagnostic"),
        now,
        safeReason(safeDiagnostic),
      ],
    );

    const row = retried.rows[0];
    if (!row) {
      throw new Error("Worker retry was not persisted; max attempts may already be reached.");
    }

    return toWorkerJobRecord(row);
  }

  async deadLetter(
    jobId: string,
    attemptId: number,
    failureClass: WorkerFailureClass,
    reasonCode: string,
    safeDiagnostic: WorkerSafeDiagnostic,
    nextOperatorAction: string,
    now: Date,
  ): Promise<WorkerJobRecord> {
    const deadLettered = await this.client.query<WorkerJobRow>(
      `WITH attempt AS (
         UPDATE worker_job_attempts
            SET status = 'dead_lettered',
                failure_class = $3,
                safe_diagnostic = $5::jsonb,
                finished_at = $7
          WHERE attempt_id = $2
            AND job_id = $1
          RETURNING *
       ), updated_job AS (
         UPDATE worker_jobs
            SET status = 'dead_lettered',
                locked_by = NULL,
                locked_until = NULL,
                completed_at = $7,
                last_error_class = $3,
                last_error_reason = $4,
                updated_at = $7
           FROM attempt
          WHERE worker_jobs.job_id = attempt.job_id
          RETURNING worker_jobs.*
       ), dead_letter AS (
         INSERT INTO worker_dead_letters (
           job_id,
           attempt_id,
           worker_kind,
           brand_id,
           merchant_id,
           store_id,
           source,
           producer_service,
           producer_environment,
           input_watermark,
           attempt_count,
           failure_class,
           reason_code,
           safe_diagnostic,
           next_operator_action,
           created_at
         )
         SELECT updated_job.job_id,
                attempt.attempt_id,
                updated_job.worker_kind,
                updated_job.brand_id,
                updated_job.merchant_id,
                updated_job.store_id,
                updated_job.source,
                updated_job.producer_service,
                updated_job.producer_environment,
                updated_job.input_watermark,
                updated_job.attempt_count,
                $3,
                $4,
                $5::jsonb,
                $6,
                $7
           FROM updated_job
           JOIN attempt ON attempt.job_id = updated_job.job_id
         ON CONFLICT (job_id) DO UPDATE
              SET attempt_id = EXCLUDED.attempt_id,
                  attempt_count = EXCLUDED.attempt_count,
                  failure_class = EXCLUDED.failure_class,
                  reason_code = EXCLUDED.reason_code,
                  safe_diagnostic = EXCLUDED.safe_diagnostic,
                  next_operator_action = EXCLUDED.next_operator_action,
                  created_at = EXCLUDED.created_at
         RETURNING job_id
       )
       SELECT updated_job.*
         FROM updated_job
         JOIN dead_letter ON dead_letter.job_id = updated_job.job_id`,
      [
        jobId,
        attemptId,
        failureClass,
        reasonCode,
        stringifyJsonb(safeDiagnostic, "worker dead-letter diagnostic"),
        nextOperatorAction,
        now,
      ],
    );

    const row = deadLettered.rows[0];
    if (!row) {
      throw new Error("Worker dead-letter did not return a row.");
    }

    return toWorkerJobRecord(row);
  }

  async readFreshness(
    workerKind: WorkerKind,
    tenantScope: WorkerTenantScope,
    sourceScope: WorkerSourceScope,
  ): Promise<WorkerFreshnessRecord | undefined> {
    const freshness = await this.client.query<WorkerFreshnessRow>(
      `SELECT *
         FROM worker_checkpoints
        WHERE worker_kind = $1
          AND merchant_id IS NOT DISTINCT FROM $2
          AND store_id IS NOT DISTINCT FROM $3
          AND source = $4
          AND producer_service IS NOT DISTINCT FROM $5
          AND producer_environment IS NOT DISTINCT FROM $6
        LIMIT 1`,
      [
        workerKind,
        tenantScope.merchantId ?? null,
        tenantScope.storeId ?? null,
        sourceScope.source,
        sourceScope.producerService ?? null,
        sourceScope.producerEnvironment ?? null,
      ],
    );

    const row = freshness.rows[0];
    return row ? toWorkerFreshnessRecord(row) : undefined;
  }
}

function stableWorkerJobId(input: EnqueueWorkerJobInput): string {
  return `worker_job:${hashStableJson({
    idempotencyIdentity: input.idempotencyIdentity,
    sourceScope: input.sourceScope,
    tenantScope: input.tenantScope,
    workerKind: input.workerKind,
  })}`;
}

function hashStableJson(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 32);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function stringifyJsonb(value: unknown, label: string): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    throw new Error(`Could not serialize ${label} as JSON: ${(error as Error).message}`);
  }
}

function safeReason(diagnostic: WorkerSafeDiagnostic): string | undefined {
  const reasonCode = diagnostic.reasonCode;
  return typeof reasonCode === "string" ? reasonCode : undefined;
}

function toWorkerJobRecord(row: WorkerJobRow): WorkerJobRecord {
  return {
    jobId: row.job_id,
    workerKind: row.worker_kind,
    status: row.status,
    tenantScope: {
      brandId: row.brand_id,
      merchantId: row.merchant_id,
      storeId: row.store_id,
    },
    sourceScope: {
      source: row.source,
      producerService: row.producer_service,
      producerEnvironment: row.producer_environment,
    },
    inputWatermark: row.input_watermark,
    idempotencyIdentity: row.idempotency_identity,
    correlationId: row.correlation_id,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    lockedBy: row.locked_by ?? undefined,
    lockedUntil: isoOrUndefined(row.locked_until),
    heartbeatAt: isoOrUndefined(row.heartbeat_at),
    nextRunAt: isoString(row.next_run_at),
    startedAt: isoOrUndefined(row.started_at),
    completedAt: isoOrUndefined(row.completed_at),
    lastErrorClass: row.last_error_class ?? undefined,
    lastErrorReason: row.last_error_reason ?? undefined,
    createdAt: isoString(row.created_at),
    updatedAt: isoString(row.updated_at),
  };
}

function toWorkerAttemptRecord(row: WorkerAttemptRow): WorkerJobAttemptRecord {
  return {
    attemptId: Number(row.attempt_id),
    jobId: row.job_id,
    attemptNumber: row.attempt_number,
    workerKind: row.worker_kind,
    claimedBy: row.claimed_by,
    status: row.attempt_status,
    inputWatermark: row.attempt_input_watermark,
    outputWatermark: row.output_watermark ?? undefined,
    failureClass: row.failure_class ?? undefined,
    safeDiagnostic: row.safe_diagnostic,
    startedAt: isoString(row.attempt_started_at),
    heartbeatAt: isoOrUndefined(row.attempt_heartbeat_at),
    finishedAt: isoOrUndefined(row.finished_at),
  };
}

function toClaimedWorkerJob(row: ClaimedWorkerRow): ClaimedWorkerJob {
  return {
    job: toWorkerJobRecord(row),
    attempt: toWorkerAttemptRecord(row),
  };
}

function toWorkerFreshnessRecord(row: WorkerFreshnessRow): WorkerFreshnessRecord {
  return {
    checkpointId: row.checkpoint_id,
    workerKind: row.worker_kind,
    tenantScope: {
      brandId: row.brand_id,
      merchantId: row.merchant_id,
      storeId: row.store_id,
    },
    sourceScope: {
      source: row.source,
      producerService: row.producer_service,
      producerEnvironment: row.producer_environment,
    },
    committedWatermark: row.committed_watermark,
    committedJobId: row.committed_job_id,
    committedAttemptId: Number(row.committed_attempt_id),
    outputSummary: row.output_summary,
    committedAt: isoString(row.committed_at),
    updatedAt: isoString(row.updated_at),
  };
}

function isoOrUndefined(value: Date | string | null): string | undefined {
  return value === null ? undefined : isoString(value);
}

function isoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
