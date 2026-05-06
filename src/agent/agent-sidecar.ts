import { z } from "zod";
import { JsonValueSchema, type JsonValue } from "../contracts/event-contract.ts";
import {
  AgentReadOnlyToolNameSchema,
  AgentToolCatalogVersionSchema,
  type AgentReadOnlyToolName,
  PreparedAgentAttemptSchema,
  type PreparedAgentAttempt,
  type PreparedAttemptReadOnlyToolSurface,
} from "./prepared-attempt.ts";

export const AgentRunStatusSchema = z.enum(["started", "draft_captured", "failed"]);
export const AgentRunEventTypeSchema = z.enum([
  "run_started",
  "attempt_loaded",
  "policy_evaluated",
  "runtime_selected",
  "harness_invoked",
  "tool_call_attempt",
  "tool_call_denied",
  "tool_result_sanitized",
  "harness_transcript_event",
  "draft_captured",
  "draft_validation_evaluated",
  "merchant_review_requested",
  "run_failed",
]);
export const AgentDraftTruthStatusSchema = z.literal("agent_draft_not_core_truth");
export const AgentRuntimeModeSchema = z.enum(["pi_sdk_adapter", "unselected"]);
export const AgentRuntimePolicyVersionSchema = z.literal("agent-runtime-policy.v1");
export const AgentRuntimeMutationPolicySchema = z.literal("no_core_or_business_mutation");
export const AgentRuntimeUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
  estimatedCostMicros: z.number().int().nonnegative().optional(),
  currency: z.string().min(1).max(16).optional(),
});

export type AgentRunStatus = z.infer<typeof AgentRunStatusSchema>;
export type AgentRunEventType = z.infer<typeof AgentRunEventTypeSchema>;
export type AgentDraftTruthStatus = z.infer<typeof AgentDraftTruthStatusSchema>;
export type AgentRuntimeMode = z.infer<typeof AgentRuntimeModeSchema>;
export type AgentRuntimeUsage = z.infer<typeof AgentRuntimeUsageSchema>;

export const AgentDraftOutputSchema = z.object({
  outputKind: z.literal("intervention_hypothesis_draft"),
  truthStatus: AgentDraftTruthStatusSchema,
  hypothesis: z.string().min(1),
  reasoningSummary: z.string().min(1),
  draftExperimentPlan: z.object({
    objective: z.string().min(1),
    measurementMetricId: z.string().min(1),
    guardrailMetricIds: z.array(z.string().min(1)),
    merchantReviewRequired: z.literal(true),
  }),
  evidenceRefs: z.array(z.string().min(1)),
  allowedDraftOperationsUsed: z.array(z.string().min(1)),
  requestedCoreWrites: z.array(z.never()).length(0),
  disallowedMutationTargetsAcknowledged: z.array(z.string().min(1)).min(1),
});

export const AgentRunSchema = z.object({
  agentRunId: z.string().min(1),
  sessionId: z.string().min(1),
  attemptId: z.string().min(1),
  brandId: z.string().min(1),
  storeId: z.string().min(1),
  opportunityGapId: z.string().min(1),
  status: AgentRunStatusSchema,
  startedAt: z.string().min(1),
  completedAt: z.string().min(1).optional(),
  provider: z.string().min(1),
  model: z.string().min(1),
  profile: z.string().min(1),
  runtimeMode: AgentRuntimeModeSchema,
  authRef: z.string().min(1),
  promptRef: z.string().min(1),
  contextBundleVersion: z.literal("agent-context-bundle.v1"),
  contextSeedHash: z.string().min(1),
  toolCatalogVersion: AgentToolCatalogVersionSchema,
  toolPolicyVersion: AgentRuntimePolicyVersionSchema,
  runtimeUsage: AgentRuntimeUsageSchema.optional(),
  draft: AgentDraftOutputSchema.optional(),
  errorMessage: z.string().min(1).optional(),
  evidenceRefs: z.array(z.string().min(1)),
});

export const AgentRunEventSchema = z.object({
  agentRunEventId: z.string().min(1),
  agentRunId: z.string().min(1),
  sessionId: z.string().min(1),
  storeId: z.string().min(1),
  opportunityGapId: z.string().min(1),
  eventType: AgentRunEventTypeSchema,
  occurredAt: z.string().min(1),
  metadata: z.record(z.string(), JsonValueSchema),
});

export const AgentAttemptPromptSchema = z.object({
  promptRef: z.string().min(1),
  systemInstructions: z.string().min(1),
});

export const AgentRuntimePolicySchema = z.object({
  policyVersion: AgentRuntimePolicyVersionSchema,
  toolCatalogVersion: AgentToolCatalogVersionSchema,
  mutationPolicy: AgentRuntimeMutationPolicySchema,
  accepted: z.literal(true),
  allowedToolNames: z.array(AgentReadOnlyToolNameSchema).min(1),
});

export const SelectedAgentRuntimeConfigSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  profile: z.string().min(1),
  runtimeMode: z.literal("pi_sdk_adapter"),
  authRef: z.string().min(1),
});

export const AgentHarnessTranscriptEventSchema = z.object({
  type: z.enum(["tool_call", "tool_result", "reasoning_summary", "draft_emitted"]),
  toolName: AgentReadOnlyToolNameSchema.optional(),
  summary: z.string().min(1),
});

export type AgentDraftOutput = z.infer<typeof AgentDraftOutputSchema>;
export type AgentRun = z.infer<typeof AgentRunSchema>;
export type AgentRunEvent = z.infer<typeof AgentRunEventSchema>;
export type AgentAttemptPrompt = z.infer<typeof AgentAttemptPromptSchema>;
export type AgentRuntimePolicy = z.infer<typeof AgentRuntimePolicySchema>;
export type SelectedAgentRuntimeConfig = z.infer<typeof SelectedAgentRuntimeConfigSchema>;
export type AgentHarnessTranscriptEvent = z.infer<typeof AgentHarnessTranscriptEventSchema>;

type AsyncTool<Fn> = Fn extends (...args: infer Args) => infer Result ? (...args: Args) => Promise<Result> : never;

export type AgentRuntimeToolSurface = {
  [Name in keyof PreparedAttemptReadOnlyToolSurface]: AsyncTool<PreparedAttemptReadOnlyToolSurface[Name]>;
};

export type AgentHarnessCallbacks = {
  onAuditEvent(event: AgentRunEvent): Promise<void> | void;
  onTranscriptEvent(event: AgentHarnessTranscriptEvent): Promise<void> | void;
};

export type AgentHarnessTurnInput = {
  preparedAttempt: PreparedAgentAttempt;
  prompt: AgentAttemptPrompt;
  tools: AgentRuntimeToolSurface;
  policy: AgentRuntimePolicy;
  runtime: SelectedAgentRuntimeConfig;
  callbacks: AgentHarnessCallbacks;
};

export type AgentHarnessTurnResult = {
  draft: AgentDraftOutput;
  transcript: AgentHarnessTranscriptEvent[];
  runtimeUsage?: AgentRuntimeUsage;
};

export type SelectedAgentRuntime = SelectedAgentRuntimeConfig & {
  runTurn(input: AgentHarnessTurnInput): Promise<AgentHarnessTurnResult>;
};

export type AgentRunAuditStore = {
  appendRun(run: AgentRun): Promise<void>;
  appendEvent(event: AgentRunEvent): Promise<void>;
  replaceRun(run: AgentRun): Promise<void>;
};

export type RunAgentAttemptInput = {
  preparedAttempt: PreparedAgentAttempt;
  prompt: AgentAttemptPrompt;
  tools: PreparedAttemptReadOnlyToolSurface;
  policy: AgentRuntimePolicy;
  runtime: SelectedAgentRuntime;
  auditStore: AgentRunAuditStore;
  callbacks: AgentHarnessCallbacks;
  now?: () => string;
};

export type RunAgentAttemptResult = {
  run: AgentRun;
  events: AgentRunEvent[];
};

export class InMemoryAgentRunAuditStore implements AgentRunAuditStore {
  readonly runs = new Map<string, AgentRun>();
  readonly events: AgentRunEvent[] = [];

  async appendRun(run: AgentRun): Promise<void> {
    this.runs.set(run.agentRunId, AgentRunSchema.parse(run));
  }

  async appendEvent(event: AgentRunEvent): Promise<void> {
    this.events.push(AgentRunEventSchema.parse(event));
  }

  async replaceRun(run: AgentRun): Promise<void> {
    this.runs.set(run.agentRunId, AgentRunSchema.parse(run));
  }
}

export async function runAgentAttempt(input: RunAgentAttemptInput): Promise<RunAgentAttemptResult> {
  const preparedAttempt = PreparedAgentAttemptSchema.parse(input.preparedAttempt);
  const now = input.now ?? (() => new Date().toISOString());
  const startedAt = now();
  const events: AgentRunEvent[] = [];
  const baseRun = baseAuditRun(preparedAttempt, input, startedAt);

  await input.auditStore.appendRun(baseRun);

  let callbacksForFailure: AgentHarnessCallbacks | undefined;

  try {
    const callbacks = parseCallbacks(input.callbacks);
    callbacksForFailure = callbacks;
    await appendEvent(input.auditStore, events, preparedAttempt, "run_started", startedAt, {
      attemptId: preparedAttempt.attemptId,
      status: preparedAttempt.status,
    }, callbacks);

    assertPreparedAttemptConsumable(preparedAttempt);
    await appendEvent(input.auditStore, events, preparedAttempt, "attempt_loaded", now(), {
      contextSeedHash: preparedAttempt.contextSeedHash ?? "missing",
      freshnessRefCount: preparedAttempt.workerFreshnessRefs.length,
    }, callbacks);

    const prompt = parsePrompt(input.prompt);
    const policy = freezeRuntimePolicy(parseAndCheckPolicy(input.policy, preparedAttempt));
    assertToolSurface(input.tools, policy);
    const runtimeTools = createRuntimeToolBoundary({
      rawTools: input.tools,
      preparedAttempt,
      policy,
      auditStore: input.auditStore,
      events,
      callbacks,
      now,
    });
    await appendEvent(input.auditStore, events, preparedAttempt, "policy_evaluated", now(), {
      policyVersion: policy.policyVersion,
      toolCatalogVersion: policy.toolCatalogVersion,
      mutationPolicy: policy.mutationPolicy,
      allowedToolNames: policy.allowedToolNames,
      deniedCapabilities: preparedAttempt.forbiddenCapabilities,
    }, callbacks);

    const runtime = parseRuntime(input.runtime);
    assertRuntimeHarness(input.runtime);
    await appendEvent(input.auditStore, events, preparedAttempt, "runtime_selected", now(), {
      provider: runtime.provider,
      model: runtime.model,
      profile: runtime.profile,
      runtimeMode: runtime.runtimeMode,
      authRef: runtime.authRef,
    }, callbacks);

    await appendEvent(input.auditStore, events, preparedAttempt, "harness_invoked", now(), {
      runtimeMode: runtime.runtimeMode,
      toolCount: policy.allowedToolNames.length,
      toolPolicyVersion: policy.policyVersion,
      mutationPolicy: policy.mutationPolicy,
    }, callbacks);

    const turnResult = await input.runtime.runTurn({ preparedAttempt, prompt, tools: runtimeTools, policy, runtime, callbacks });
    const runtimeUsage = AgentRuntimeUsageSchema.optional().parse(turnResult.runtimeUsage);
    const transcript = z.array(AgentHarnessTranscriptEventSchema).parse(turnResult.transcript);
    for (const transcriptEvent of transcript) {
      await callbacks.onTranscriptEvent(transcriptEvent);
      await appendEvent(input.auditStore, events, preparedAttempt, "harness_transcript_event", now(), {
        type: transcriptEvent.type,
        toolName: transcriptEvent.toolName ?? "none",
        summary: redactText(transcriptEvent.summary),
      }, callbacks);
    }

    const draft = AgentDraftOutputSchema.parse(turnResult.draft);
    assertNoCoreWrites(draft);
    const completedAt = now();
    const run = AgentRunSchema.parse({
      ...baseRun,
      status: "draft_captured",
      completedAt,
      runtimeUsage,
      draft,
    });
    await appendEvent(input.auditStore, events, preparedAttempt, "draft_captured", completedAt, {
      truthStatus: draft.truthStatus,
      requestedCoreWriteCount: draft.requestedCoreWrites.length,
      evidenceRefCount: draft.evidenceRefs.length,
      latencyMs: elapsedMs(startedAt, completedAt),
      runtimeUsage: runtimeUsage ? runtimeUsageMetadata(runtimeUsage) : undefined,
    }, callbacks);
    await input.auditStore.replaceRun(run);
    return { run, events };
  } catch (error) {
    const failedAt = now();
    const run = AgentRunSchema.parse({
      ...baseRun,
      status: "failed",
      completedAt: failedAt,
      errorMessage: redactText(error instanceof Error ? error.message : String(error)),
    });
    await appendEvent(input.auditStore, events, preparedAttempt, "run_failed", failedAt, {
      errorMessage: run.errorMessage ?? "unknown",
      latencyMs: elapsedMs(startedAt, failedAt),
    }, callbacksForFailure);
    await input.auditStore.replaceRun(run);
    return { run, events };
  }
}

export function assertNoCoreWrites(draft: AgentDraftOutput): void {
  if (draft.truthStatus !== "agent_draft_not_core_truth") {
    throw new Error("Agent draft must not be promoted to Core truth.");
  }
  if (draft.requestedCoreWrites.length !== 0) {
    throw new Error("Agent draft requested deterministic Core writes.");
  }
}

function baseAuditRun(preparedAttempt: PreparedAgentAttempt, input: RunAgentAttemptInput, startedAt: string): AgentRun {
  const runtime = SelectedAgentRuntimeConfigSchema.safeParse(input.runtime);
  const prompt = AgentAttemptPromptSchema.safeParse(input.prompt);
  const policy = AgentRuntimePolicySchema.safeParse(input.policy);
  return AgentRunSchema.parse({
    agentRunId: preparedAttempt.agentRunId,
    sessionId: preparedAttempt.sessionId,
    attemptId: preparedAttempt.attemptId,
    brandId: preparedAttempt.brandId,
    storeId: preparedAttempt.storeId,
    opportunityGapId: preparedAttempt.opportunityGapId,
    status: "started",
    startedAt,
    provider: runtime.success ? runtime.data.provider : "unselected",
    model: runtime.success ? runtime.data.model : "unselected",
    profile: runtime.success ? runtime.data.profile : "unselected",
    runtimeMode: runtime.success ? runtime.data.runtimeMode : "unselected",
    authRef: runtime.success ? runtime.data.authRef : "unselected",
    promptRef: prompt.success ? prompt.data.promptRef : "unselected",
    contextBundleVersion: preparedAttempt.contextBundleVersion,
    contextSeedHash: preparedAttempt.contextSeedHash ?? "missing_context_seed_hash",
    toolCatalogVersion: preparedAttempt.toolCatalogVersion,
    toolPolicyVersion: policy.success ? policy.data.policyVersion : "agent-runtime-policy.v1",
    evidenceRefs: preparedAttempt.contextSeed?.evidenceRefs ?? [],
  });
}

function assertPreparedAttemptConsumable(preparedAttempt: PreparedAgentAttempt): void {
  if (preparedAttempt.status !== "prepared") {
    throw new Error(`Prepared attempt is not consumable by Agent runtime: ${preparedAttempt.status}.`);
  }
  if (!preparedAttempt.contextSeed || !preparedAttempt.contextSeedHash) {
    throw new Error("Prepared attempt is missing context seed or context seed hash.");
  }
}

function parsePrompt(promptInput: AgentAttemptPrompt): AgentAttemptPrompt {
  const prompt = AgentAttemptPromptSchema.parse(promptInput);
  if (containsSensitiveText(prompt.promptRef) || containsSensitiveText(prompt.systemInstructions)) {
    throw new Error("Agent prompt contains sensitive token-like content and cannot be sent to runtime.");
  }
  return prompt;
}

function parseAndCheckPolicy(policyInput: AgentRuntimePolicy, preparedAttempt: PreparedAgentAttempt): AgentRuntimePolicy {
  const policy = AgentRuntimePolicySchema.parse(policyInput);
  if (policy.toolCatalogVersion !== preparedAttempt.toolCatalogVersion) {
    throw new Error("Agent runtime policy tool catalog version does not match prepared attempt catalog version.");
  }
  const allowedFromAttempt = new Set<string>(preparedAttempt.allowedReadCapabilities);
  const outOfScopeTool = policy.allowedToolNames.find((toolName) => !allowedFromAttempt.has(toolName));
  if (outOfScopeTool) {
    throw new Error(`Agent runtime policy allows a tool outside prepared attempt scope: ${outOfScopeTool}.`);
  }
  return policy;
}

function freezeRuntimePolicy(policy: AgentRuntimePolicy): AgentRuntimePolicy {
  return Object.freeze({ ...policy, allowedToolNames: Object.freeze([...policy.allowedToolNames]) }) as AgentRuntimePolicy;
}

function parseRuntime(runtimeInput: SelectedAgentRuntime): SelectedAgentRuntimeConfig {
  const runtime = SelectedAgentRuntimeConfigSchema.parse(runtimeInput);
  if (containsSensitiveText(runtime.authRef) || containsSensitiveText(runtime.provider) || containsSensitiveText(runtime.model)) {
    throw new Error("Agent runtime selection contains sensitive auth/provider/model text.");
  }
  return runtime;
}

function assertRuntimeHarness(runtime: SelectedAgentRuntime): void {
  if (typeof runtime.runTurn !== "function") {
    throw new Error("Agent runtime selection is missing the harness turn callback.");
  }
}

function parseCallbacks(callbacks: AgentHarnessCallbacks): AgentHarnessCallbacks {
  if (!callbacks || typeof callbacks.onAuditEvent !== "function" || typeof callbacks.onTranscriptEvent !== "function") {
    throw new Error("Agent runtime requires audit and transcript callbacks.");
  }
  return callbacks;
}

const AGENT_RUNTIME_TOOL_NAMES: AgentReadOnlyToolName[] = [...AgentReadOnlyToolNameSchema.options];
const AGENT_RUNTIME_TOOL_NAME_SET = new Set<string>(AGENT_RUNTIME_TOOL_NAMES);

type RuntimeToolBoundaryInput = {
  rawTools: PreparedAttemptReadOnlyToolSurface;
  preparedAttempt: PreparedAgentAttempt;
  policy: AgentRuntimePolicy;
  auditStore: AgentRunAuditStore;
  events: AgentRunEvent[];
  callbacks: AgentHarnessCallbacks;
  now: () => string;
};

function assertToolSurface(tools: PreparedAttemptReadOnlyToolSurface, policy: AgentRuntimePolicy): void {
  if (!tools) {
    throw new Error("Agent runtime requires a read-only tool surface.");
  }

  const exposedFunctionNames = Object.entries(tools)
    .filter(([, value]) => typeof value === "function")
    .map(([name]) => name);
  const unregisteredTool = exposedFunctionNames.find((toolName) => !AGENT_RUNTIME_TOOL_NAME_SET.has(toolName));
  if (unregisteredTool) {
    throw new Error(`Agent runtime tool surface contains unregistered tool: ${unregisteredTool}.`);
  }

  for (const toolName of policy.allowedToolNames) {
    if (typeof tools[toolName] !== "function") {
      throw new Error(`Agent runtime policy references unavailable tool: ${toolName}.`);
    }
  }
}

function createRuntimeToolBoundary(input: RuntimeToolBoundaryInput): AgentRuntimeToolSurface {
  return Object.fromEntries(
    AGENT_RUNTIME_TOOL_NAMES.map((toolName) => [
      toolName,
      async (toolInput?: unknown) => guardedToolCall(input, toolName, toolInput),
    ]),
  ) as AgentRuntimeToolSurface;
}

async function guardedToolCall(input: RuntimeToolBoundaryInput, toolName: AgentReadOnlyToolName, toolInput: unknown): Promise<unknown> {
  if (!input.policy.allowedToolNames.includes(toolName)) {
    await appendEvent(input.auditStore, input.events, input.preparedAttempt, "tool_call_denied", input.now(), {
      toolName,
      reason: "tool_not_allowed_by_runtime_policy",
      policyVersion: input.policy.policyVersion,
      mutationPolicy: input.policy.mutationPolicy,
    }, input.callbacks);
    throw new Error(`Agent runtime policy denied tool call before execution: ${toolName}.`);
  }

  await appendEvent(input.auditStore, input.events, input.preparedAttempt, "tool_call_attempt", input.now(), {
    toolName,
    policyVersion: input.policy.policyVersion,
    mutationPolicy: input.policy.mutationPolicy,
  }, input.callbacks);

  const rawResult = callPreparedTool(input.rawTools, toolName, toolInput);
  const sanitizedResult = sanitizeToolResult(rawResult);
  const resultBytes = byteLength(sanitizedResult);
  if (resultBytes > input.preparedAttempt.contextBudget.maxToolResultBytes) {
    await appendEvent(input.auditStore, input.events, input.preparedAttempt, "tool_call_denied", input.now(), {
      toolName,
      reason: "sanitized_tool_result_exceeds_budget",
      resultBytes,
      maxToolResultBytes: input.preparedAttempt.contextBudget.maxToolResultBytes,
      policyVersion: input.policy.policyVersion,
    }, input.callbacks);
    throw new Error(`Agent runtime tool result exceeded sanitized result budget: ${toolName}.`);
  }

  await appendEvent(input.auditStore, input.events, input.preparedAttempt, "tool_result_sanitized", input.now(), {
    toolName,
    resultBytes,
    policyVersion: input.policy.policyVersion,
    mutationPolicy: input.policy.mutationPolicy,
  }, input.callbacks);
  return sanitizedResult;
}

function callPreparedTool(tools: PreparedAttemptReadOnlyToolSurface, toolName: AgentReadOnlyToolName, toolInput: unknown): unknown {
  switch (toolName) {
    case "read_worker_freshness":
      return tools.read_worker_freshness(z.object({ workerKind: z.enum(["projection", "snapshot", "benchmark", "evidence"]) }).parse(toolInput));
    case "read_projection_summary":
      return tools.read_projection_summary(z.object({ committedJobId: z.string().min(1) }).parse(toolInput));
    case "read_snapshot_summary":
      return tools.read_snapshot_summary(z.object({ committedJobId: z.string().min(1) }).parse(toolInput));
    case "read_benchmark_opportunity_gaps":
      return tools.read_benchmark_opportunity_gaps(z.object({ committedJobId: z.string().min(1) }).parse(toolInput));
    case "read_evidence_records":
      return tools.read_evidence_records(z.object({ committedJobId: z.string().min(1) }).parse(toolInput));
    case "read_dead_letter_diagnosis":
      return tools.read_dead_letter_diagnosis();
  }
}

function sanitizeToolResult<T>(value: T): T {
  return sanitizeJsonValue(value) as T;
}

function sanitizeJsonValue(value: unknown): unknown {
  if (typeof value === "string") {
    return redactText(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeJsonValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, sanitizeJsonValue(child)]));
  }
  return value;
}

async function appendEvent(
  store: AgentRunAuditStore,
  events: AgentRunEvent[],
  attempt: PreparedAgentAttempt,
  eventType: AgentRunEventType,
  occurredAt: string,
  metadata: Record<string, JsonValue | undefined>,
  callbacks?: AgentHarnessCallbacks,
): Promise<void> {
  const event = AgentRunEventSchema.parse({
    agentRunEventId: `agent_run_event:${attempt.agentRunId}:${events.length + 1}`,
    agentRunId: attempt.agentRunId,
    sessionId: attempt.sessionId,
    storeId: attempt.storeId,
    opportunityGapId: attempt.opportunityGapId,
    eventType,
    occurredAt,
    metadata: toJsonMetadata(metadata),
  });
  events.push(event);
  await store.appendEvent(event);
  await callbacks?.onAuditEvent(event);
}

function toJsonMetadata(metadata: Record<string, JsonValue | undefined>): Record<string, JsonValue> {
  return Object.fromEntries(Object.entries(metadata).filter((entry): entry is [string, JsonValue] => entry[1] !== undefined));
}

function byteLength(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function elapsedMs(startedAt: string, completedAt: string): number {
  const started = Date.parse(startedAt);
  const completed = Date.parse(completedAt);
  if (!Number.isFinite(started) || !Number.isFinite(completed) || completed < started) {
    return 0;
  }
  return completed - started;
}

function runtimeUsageMetadata(runtimeUsage: AgentRuntimeUsage): Record<string, JsonValue> {
  return toJsonMetadata({
    inputTokens: runtimeUsage.inputTokens,
    outputTokens: runtimeUsage.outputTokens,
    totalTokens: runtimeUsage.totalTokens,
    estimatedCostMicros: runtimeUsage.estimatedCostMicros,
    currency: runtimeUsage.currency,
  });
}

function containsSensitiveText(value: string): boolean {
  return /bearer\s+|authorization:|password=|secret=|token=|credential=|database_url|BEGIN RSA PRIVATE KEY|sk-[A-Za-z0-9_-]+|raw[-_ ]?payload|paymentId=|customerPhone=|customerId=|memberId=|card=|pan=/i.test(value);
}

function redactText(value: string): string {
  return value
    .replace(/bearer\s+\S+/gi, "bearer [redacted]")
    .replace(/(authorization|password|secret|token|credential|database_url|auth|key)=\S+/gi, "$1=[redacted]")
    .replace(/(paymentId|customerPhone|customerId|memberId|card|pan)=\S+/gi, "$1=[redacted]")
    .replace(/raw[-_ ]?payload\S*/gi, "raw_payload=[redacted]")
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted-key]");
}
