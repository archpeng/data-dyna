import { createHash } from "node:crypto";
import { z } from "zod";
import { JsonValueSchema, type JsonValue } from "../contracts/event-contract.ts";
import type { WorkerFreshnessRecord, WorkerKind } from "../app/workers/index.ts";

export const PreparedAttemptStatusSchema = z.enum([
  "prepared",
  "blocked_missing_freshness",
  "blocked_stale_freshness",
  "blocked_dead_letter",
  "blocked_tenant_mismatch",
  "blocked_policy",
]);

export const PreparedAttemptIdentitySourceSchema = z.literal("deterministic_tenant_scope");
export const AgentContextSeedVersionSchema = z.literal("agent-context-seed.v1");
export const AgentToolCatalogVersionSchema = z.literal("agent-read-tools.v1");

export const AgentReadOnlyToolNameSchema = z.enum([
  "read_worker_freshness",
  "read_projection_summary",
  "read_snapshot_summary",
  "read_benchmark_opportunity_gaps",
  "read_evidence_records",
  "read_dead_letter_diagnosis",
]);

export const PreparedAttemptFailureReasonSchema = z.object({
  code: z.enum([
    "missing_freshness",
    "stale_freshness",
    "dead_lettered_worker",
    "tenant_or_source_mismatch",
    "context_budget_exceeded",
    "forbidden_raw_data",
    "free_form_identity_scope",
    "unsafe_tool_catalog",
  ]),
  message: z.string().min(1),
});

export const PreparedAttemptContextBudgetSchema = z.object({
  maxSeedBytes: z.number().int().positive(),
  maxToolResultBytes: z.number().int().positive(),
});

export const WorkerTenantScopeSchema = z.object({
  brandId: z.string().min(1).optional(),
  merchantId: z.string().min(1).optional(),
  storeId: z.string().min(1).optional(),
});

export const WorkerSourceScopeSchema = z.object({
  source: z.string().min(1),
  producerService: z.string().min(1).optional(),
  producerEnvironment: z.string().min(1).optional(),
});

export const WorkerFreshnessRefSchema = z.object({
  workerKind: z.enum(["projection", "snapshot", "benchmark", "evidence"]),
  tenantScope: WorkerTenantScopeSchema,
  sourceScope: WorkerSourceScopeSchema,
  committedJobId: z.string().min(1),
  committedAttemptId: z.number().int().nonnegative(),
  committedWatermark: z.record(z.string(), JsonValueSchema),
  committedAt: z.string().min(1),
  outputSummary: z.record(z.string(), JsonValueSchema),
});

export const AgentReadOnlyToolDescriptorSchema = z.object({
  name: AgentReadOnlyToolNameSchema,
  capability: z.literal("read_context"),
  mutationPolicy: z.literal("no_core_or_business_mutation"),
  requiresFreshnessRef: z.boolean(),
  inputBoundary: z.string().min(1),
  outputBoundary: z.string().min(1),
});

export const AgentContextSeedSchema = z.object({
  seedVersion: AgentContextSeedVersionSchema,
  brandId: z.string().min(1),
  storeId: z.string().min(1),
  opportunityGapId: z.string().min(1),
  contextBundleVersion: z.literal("agent-context-bundle.v1"),
  evidenceRefs: z.array(z.string().min(1)),
  assumptions: z.array(z.string().min(1)),
  freshnessIndex: z.array(
    z.object({
      workerKind: z.enum(["projection", "snapshot", "benchmark", "evidence"]),
      toolName: AgentReadOnlyToolNameSchema,
      committedJobId: z.string().min(1),
      committedAttemptId: z.number().int().nonnegative(),
      committedAt: z.string().min(1),
    }),
  ),
});

export const PreparedAgentAttemptSchema = z.object({
  attemptId: z.string().min(1),
  agentRunId: z.string().min(1),
  sessionId: z.string().min(1),
  brandId: z.string().min(1),
  storeId: z.string().min(1),
  opportunityGapId: z.string().min(1),
  requestedBy: z.string().min(1),
  createdAt: z.string().min(1),
  identitySource: PreparedAttemptIdentitySourceSchema,
  status: PreparedAttemptStatusSchema,
  contextBundleVersion: z.literal("agent-context-bundle.v1"),
  toolCatalogVersion: AgentToolCatalogVersionSchema,
  contextBudget: PreparedAttemptContextBudgetSchema,
  allowedReadCapabilities: z.array(AgentReadOnlyToolNameSchema),
  forbiddenCapabilities: z.array(z.string().min(1)),
  workerFreshnessRefs: z.array(WorkerFreshnessRefSchema),
  contextSeed: AgentContextSeedSchema.optional(),
  contextSeedHash: z.string().min(1).optional(),
  failureReason: PreparedAttemptFailureReasonSchema.optional(),
});

export type PreparedAttemptStatus = z.infer<typeof PreparedAttemptStatusSchema>;
export type PreparedAttemptFailureReason = z.infer<typeof PreparedAttemptFailureReasonSchema>;
export type PreparedAttemptContextBudget = z.infer<typeof PreparedAttemptContextBudgetSchema>;
export type WorkerFreshnessRef = z.infer<typeof WorkerFreshnessRefSchema>;
export type AgentReadOnlyToolName = z.infer<typeof AgentReadOnlyToolNameSchema>;
export type AgentReadOnlyToolDescriptor = z.infer<typeof AgentReadOnlyToolDescriptorSchema>;
export type AgentContextSeed = z.infer<typeof AgentContextSeedSchema>;
export type PreparedAgentAttempt = z.infer<typeof PreparedAgentAttemptSchema>;

export type PreparedAttemptDeadLetterDiagnosis = {
  workerKind: WorkerKind;
  jobId: string;
  failureClass: string;
  reasonCode: string;
  nextOperatorAction: string;
};

export type PrepareAgentAttemptInput = {
  attemptId: string;
  agentRunId: string;
  sessionId: string;
  brandId: string;
  storeId: string;
  opportunityGapId: string;
  requestedBy: string;
  createdAt: string;
  identitySource: "deterministic_tenant_scope" | "free_form_agent_input";
  freshnessRecords: WorkerFreshnessRecord[];
  contextBudget: PreparedAttemptContextBudget;
  evidenceRefs?: string[];
  assumptions?: string[];
  minimumCommittedAt?: string;
  requiredWorkerKinds?: WorkerKind[];
  toolCatalog?: AgentReadOnlyToolDescriptor[];
  deadLetterDiagnoses?: PreparedAttemptDeadLetterDiagnosis[];
};

export type PreparedAttemptReadOnlyToolSurface = {
  read_worker_freshness(input: { workerKind: WorkerKind }): WorkerFreshnessRef;
  read_projection_summary(input: { committedJobId: string }): ReadOnlyToolSummaryResult;
  read_snapshot_summary(input: { committedJobId: string }): ReadOnlyToolSummaryResult;
  read_benchmark_opportunity_gaps(input: { committedJobId: string }): ReadOnlyToolSummaryResult;
  read_evidence_records(input: { committedJobId: string }): ReadOnlyToolSummaryResult;
};

export type ReadOnlyToolSummaryResult = {
  freshnessRef: WorkerFreshnessRef;
  summary: Record<string, JsonValue>;
};

export const REQUIRED_WORKER_KINDS_FOR_PREPARED_ATTEMPT: WorkerKind[] = ["projection", "snapshot", "benchmark", "evidence"];

export const FORBIDDEN_AGENT_CAPABILITIES = [
  "arbitrary_sql",
  "raw_payload_read",
  "secret_read",
  "worker_mutation",
  "core_write",
  "business_mutation",
  "evidence_promotion",
  "merchant_decision_authority",
  "runtime_fallback_authority",
] as const;

export const DEFAULT_AGENT_READ_ONLY_TOOL_DESCRIPTORS: AgentReadOnlyToolDescriptor[] = [
  {
    name: "read_worker_freshness",
    capability: "read_context",
    mutationPolicy: "no_core_or_business_mutation",
    requiresFreshnessRef: true,
    inputBoundary: "worker kind plus prepared attempt tenant/source scope",
    outputBoundary: "committed freshness ref and count-only summary metadata",
  },
  {
    name: "read_projection_summary",
    capability: "read_context",
    mutationPolicy: "no_core_or_business_mutation",
    requiresFreshnessRef: true,
    inputBoundary: "prepared projection freshness ref",
    outputBoundary: "bounded projection aggregate summary; no raw event payloads or arbitrary SQL",
  },
  {
    name: "read_snapshot_summary",
    capability: "read_context",
    mutationPolicy: "no_core_or_business_mutation",
    requiresFreshnessRef: true,
    inputBoundary: "prepared snapshot freshness ref",
    outputBoundary: "bounded snapshot aggregate summary; merchant confirmations only when deterministic",
  },
  {
    name: "read_benchmark_opportunity_gaps",
    capability: "read_context",
    mutationPolicy: "no_core_or_business_mutation",
    requiresFreshnessRef: true,
    inputBoundary: "prepared benchmark freshness ref",
    outputBoundary: "aggregate-only benchmark gap summary; no peer-store identity",
  },
  {
    name: "read_evidence_records",
    capability: "read_context",
    mutationPolicy: "no_core_or_business_mutation",
    requiresFreshnessRef: true,
    inputBoundary: "prepared evidence freshness ref and evidence refs",
    outputBoundary: "deterministic evidence summaries only; no LLM evidence promotion",
  },
  {
    name: "read_dead_letter_diagnosis",
    capability: "read_context",
    mutationPolicy: "no_core_or_business_mutation",
    requiresFreshnessRef: false,
    inputBoundary: "blocked prepared attempt or bounded worker/job id",
    outputBoundary: "redacted failure class, reason code, and operator action only",
  },
];

export class InMemoryPreparedAgentAttemptRepository {
  readonly attempts = new Map<string, PreparedAgentAttempt>();

  async save(attempt: PreparedAgentAttempt): Promise<void> {
    this.attempts.set(attempt.attemptId, PreparedAgentAttemptSchema.parse(attempt));
  }

  async get(attemptId: string): Promise<PreparedAgentAttempt | undefined> {
    return this.attempts.get(attemptId);
  }
}

export function prepareAgentAttempt(input: PrepareAgentAttemptInput): PreparedAgentAttempt {
  const base = baseAttempt(input);
  const requiredWorkerKinds = input.requiredWorkerKinds ?? REQUIRED_WORKER_KINDS_FOR_PREPARED_ATTEMPT;
  const toolCatalog = input.toolCatalog ?? DEFAULT_AGENT_READ_ONLY_TOOL_DESCRIPTORS;
  const workerFreshnessRefs = input.freshnessRecords.map(toWorkerFreshnessRef);

  const policyFailure = evaluatePreparedAttemptPolicy({ input, requiredWorkerKinds, workerFreshnessRefs, toolCatalog });
  if (policyFailure) {
    return PreparedAgentAttemptSchema.parse({
      ...base,
      status: policyFailure.status,
      workerFreshnessRefs: safeFreshnessRefs(workerFreshnessRefs),
      allowedReadCapabilities: toolCatalog.map((tool) => tool.name),
      forbiddenCapabilities: [...FORBIDDEN_AGENT_CAPABILITIES],
      failureReason: policyFailure.reason,
    });
  }

  const contextSeed = AgentContextSeedSchema.parse({
    seedVersion: "agent-context-seed.v1",
    brandId: input.brandId,
    storeId: input.storeId,
    opportunityGapId: input.opportunityGapId,
    contextBundleVersion: "agent-context-bundle.v1",
    evidenceRefs: uniqueSorted(input.evidenceRefs ?? []),
    assumptions: input.assumptions ?? ["Peer benchmark comparison is directional and non-causal."],
    freshnessIndex: requiredWorkerKinds.map((workerKind) => {
      const ref = requireFreshnessRef(workerFreshnessRefs, workerKind);
      return {
        workerKind,
        toolName: toolNameForWorkerKind(workerKind),
        committedJobId: ref.committedJobId,
        committedAttemptId: ref.committedAttemptId,
        committedAt: ref.committedAt,
      };
    }),
  });
  const contextSeedHash = stableHash(contextSeed);
  const preparedAttempt = PreparedAgentAttemptSchema.parse({
    ...base,
    status: "prepared",
    workerFreshnessRefs,
    contextSeed,
    contextSeedHash,
    allowedReadCapabilities: toolCatalog.map((tool) => tool.name),
    forbiddenCapabilities: [...FORBIDDEN_AGENT_CAPABILITIES],
  });

  if (byteLength(contextSeed) > input.contextBudget.maxSeedBytes) {
    return PreparedAgentAttemptSchema.parse({
      ...base,
      status: "blocked_policy",
      workerFreshnessRefs,
      allowedReadCapabilities: toolCatalog.map((tool) => tool.name),
      forbiddenCapabilities: [...FORBIDDEN_AGENT_CAPABILITIES],
      failureReason: {
        code: "context_budget_exceeded",
        message: "Prepared attempt context seed exceeds the configured context budget.",
      },
    });
  }

  return preparedAttempt;
}

export function createPreparedAttemptReadOnlyTools(
  attempt: PreparedAgentAttempt,
): PreparedAttemptReadOnlyToolSurface {
  const parsed = PreparedAgentAttemptSchema.parse(attempt);
  if (parsed.status !== "prepared") {
    throw new Error("Read-only Agent tools require a prepared attempt.");
  }

  return {
    read_worker_freshness({ workerKind }) {
      return requireFreshnessRef(parsed.workerFreshnessRefs, workerKind);
    },
    read_projection_summary({ committedJobId }) {
      return readSummary(parsed, "projection", committedJobId);
    },
    read_snapshot_summary({ committedJobId }) {
      return readSummary(parsed, "snapshot", committedJobId);
    },
    read_benchmark_opportunity_gaps({ committedJobId }) {
      return readSummary(parsed, "benchmark", committedJobId);
    },
    read_evidence_records({ committedJobId }) {
      return readSummary(parsed, "evidence", committedJobId);
    },
  };
}

export function readPreparedAttemptDeadLetterDiagnosis(attempt: PreparedAgentAttempt): PreparedAttemptFailureReason | undefined {
  const parsed = PreparedAgentAttemptSchema.parse(attempt);
  return parsed.status === "blocked_dead_letter" ? parsed.failureReason : undefined;
}

function baseAttempt(input: PrepareAgentAttemptInput): Omit<
  PreparedAgentAttempt,
  "status" | "workerFreshnessRefs" | "allowedReadCapabilities" | "forbiddenCapabilities" | "contextSeed" | "contextSeedHash" | "failureReason"
> {
  return {
    attemptId: input.attemptId,
    agentRunId: input.agentRunId,
    sessionId: input.sessionId,
    brandId: input.brandId,
    storeId: input.storeId,
    opportunityGapId: input.opportunityGapId,
    requestedBy: input.requestedBy,
    createdAt: input.createdAt,
    identitySource: "deterministic_tenant_scope",
    contextBundleVersion: "agent-context-bundle.v1",
    toolCatalogVersion: "agent-read-tools.v1",
    contextBudget: input.contextBudget,
  };
}

function evaluatePreparedAttemptPolicy(input: {
  input: PrepareAgentAttemptInput;
  requiredWorkerKinds: WorkerKind[];
  workerFreshnessRefs: WorkerFreshnessRef[];
  toolCatalog: AgentReadOnlyToolDescriptor[];
}): { status: PreparedAttemptStatus; reason: PreparedAttemptFailureReason } | undefined {
  if (input.input.identitySource !== "deterministic_tenant_scope") {
    return {
      status: "blocked_policy",
      reason: {
        code: "free_form_identity_scope",
        message: "Prepared attempt identity must come from deterministic tenant scope, not free-form Agent input.",
      },
    };
  }

  const unsafeTool = input.toolCatalog.find(
    (tool) => tool.mutationPolicy !== "no_core_or_business_mutation" || tool.capability !== "read_context",
  );
  if (unsafeTool) {
    return {
      status: "blocked_policy",
      reason: {
        code: "unsafe_tool_catalog",
        message: `Prepared attempt tool catalog contains an unsafe tool: ${unsafeTool.name}.`,
      },
    };
  }

  const deadLetter = input.input.deadLetterDiagnoses?.find((diagnosis) => input.requiredWorkerKinds.includes(diagnosis.workerKind));
  if (deadLetter) {
    return {
      status: "blocked_dead_letter",
      reason: {
        code: "dead_lettered_worker",
        message: `Worker ${deadLetter.workerKind} has dead-letter diagnosis ${deadLetter.reasonCode}; next action: ${deadLetter.nextOperatorAction}.`,
      },
    };
  }

  for (const workerKind of input.requiredWorkerKinds) {
    const ref = input.workerFreshnessRefs.find((candidate) => candidate.workerKind === workerKind);
    if (!ref) {
      return {
        status: "blocked_missing_freshness",
        reason: {
          code: "missing_freshness",
          message: `Missing committed worker freshness for ${workerKind}.`,
        },
      };
    }
    if (!tenantMatches(input.input, ref)) {
      return {
        status: "blocked_tenant_mismatch",
        reason: {
          code: "tenant_or_source_mismatch",
          message: `Worker freshness for ${workerKind} does not match prepared attempt tenant scope.`,
        },
      };
    }
    if (input.input.minimumCommittedAt && ref.committedAt < input.input.minimumCommittedAt) {
      return {
        status: "blocked_stale_freshness",
        reason: {
          code: "stale_freshness",
          message: `Worker freshness for ${workerKind} is older than the required freshness watermark.`,
        },
      };
    }
    if (hasForbiddenRawData(ref.outputSummary)) {
      return {
        status: "blocked_policy",
        reason: {
          code: "forbidden_raw_data",
          message: `Worker freshness summary for ${workerKind} contains raw, secret, SQL, or identifier-shaped data.`,
        },
      };
    }
  }

  return undefined;
}

function toWorkerFreshnessRef(record: WorkerFreshnessRecord): WorkerFreshnessRef {
  return WorkerFreshnessRefSchema.parse({
    workerKind: record.workerKind,
    tenantScope: stripNullish(record.tenantScope),
    sourceScope: stripNullish(record.sourceScope),
    committedJobId: record.committedJobId,
    committedAttemptId: Number(record.committedAttemptId),
    committedWatermark: toJsonRecord(record.committedWatermark),
    committedAt: record.committedAt,
    outputSummary: toJsonRecord(record.outputSummary),
  });
}

function safeFreshnessRefs(refs: WorkerFreshnessRef[]): WorkerFreshnessRef[] {
  return refs.filter((ref) => !hasForbiddenRawData(ref.outputSummary));
}

function tenantMatches(input: PrepareAgentAttemptInput, ref: WorkerFreshnessRef): boolean {
  return ref.tenantScope.brandId === input.brandId && ref.tenantScope.storeId === input.storeId;
}

function requireFreshnessRef(refs: WorkerFreshnessRef[], workerKind: WorkerKind): WorkerFreshnessRef {
  const ref = refs.find((candidate) => candidate.workerKind === workerKind);
  if (!ref) {
    throw new Error(`Prepared attempt does not include freshness ref for ${workerKind}.`);
  }
  return ref;
}

function readSummary(attempt: PreparedAgentAttempt, workerKind: WorkerKind, committedJobId: string): ReadOnlyToolSummaryResult {
  const freshnessRef = requireFreshnessRef(attempt.workerFreshnessRefs, workerKind);
  if (freshnessRef.committedJobId !== committedJobId) {
    throw new Error(`Tool call is not scoped to the prepared ${workerKind} freshness ref.`);
  }
  assertWithinToolBudget(attempt, freshnessRef.outputSummary);
  assertNoForbiddenRawData(freshnessRef.outputSummary);
  return { freshnessRef, summary: freshnessRef.outputSummary };
}

function assertWithinToolBudget(attempt: PreparedAgentAttempt, summary: Record<string, JsonValue>): void {
  if (byteLength(summary) > attempt.contextBudget.maxToolResultBytes) {
    throw new Error("Read-only tool result exceeds the prepared attempt tool-result budget.");
  }
}

function assertNoForbiddenRawData(value: JsonValue): void {
  if (hasForbiddenRawData(value)) {
    throw new Error("Read-only tool result contains forbidden raw, secret, SQL, or identifier-shaped data.");
  }
}

function hasForbiddenRawData(value: JsonValue): boolean {
  if (Array.isArray(value)) {
    return value.some(hasForbiddenRawData);
  }
  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, child]) => forbiddenKey(key) || hasForbiddenRawData(child));
  }
  if (typeof value === "string") {
    return /bearer\s+|authorization:|password=|secret=|database_url|BEGIN RSA PRIVATE KEY/i.test(value);
  }
  return false;
}

function forbiddenKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[_-]/g, "");
  return [
    "raw",
    "rawpayload",
    "payload",
    "properties",
    "secret",
    "token",
    "bearer",
    "authorization",
    "password",
    "credential",
    "credentials",
    "pan",
    "cardnumber",
    "customerid",
    "memberid",
    "deviceid",
    "sql",
    "query",
  ].includes(normalized);
}

function toolNameForWorkerKind(workerKind: WorkerKind): AgentReadOnlyToolName {
  switch (workerKind) {
    case "projection":
      return "read_projection_summary";
    case "snapshot":
      return "read_snapshot_summary";
    case "benchmark":
      return "read_benchmark_opportunity_gaps";
    case "evidence":
      return "read_evidence_records";
  }
}

function toJsonRecord(value: Record<string, unknown>): Record<string, JsonValue> {
  return z.record(z.string(), JsonValueSchema).parse(value);
}

function stripNullish<T extends Record<string, unknown>>(value: T): Record<string, JsonValue> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null)) as Record<string, JsonValue>;
}

function stableHash(value: unknown): string {
  return `sha256:${createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}

function byteLength(value: unknown): number {
  return Buffer.byteLength(stableStringify(value), "utf8");
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortForJson(value));
}

function sortForJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortForJson);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortForJson(child)]),
    );
  }
  return value;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
