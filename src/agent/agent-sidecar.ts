import { z } from "zod";
import { JsonValueSchema, type JsonValue } from "../contracts/event-contract.ts";
import {
  AgentAllowedDraftOperationSchema,
  AgentContextBundleSchema,
  DisallowedAgentMutationTargetSchema,
  type AgentAllowedDraftOperation,
  type AgentContextBundle,
  type DisallowedAgentMutationTarget,
} from "./context-bundle.ts";

export const AgentRunStatusSchema = z.enum(["started", "draft_captured", "failed"]);
export const AgentRunEventTypeSchema = z.enum(["run_started", "context_loaded", "adapter_invoked", "draft_captured", "run_failed"]);
export const AgentDraftTruthStatusSchema = z.literal("agent_draft_not_core_truth");

export type AgentRunStatus = z.infer<typeof AgentRunStatusSchema>;
export type AgentRunEventType = z.infer<typeof AgentRunEventTypeSchema>;
export type AgentDraftTruthStatus = z.infer<typeof AgentDraftTruthStatusSchema>;

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
  evidenceRefs: z.array(z.string().min(1)).min(1),
  allowedDraftOperationsUsed: z.array(AgentAllowedDraftOperationSchema),
  requestedCoreWrites: z.array(z.never()).length(0),
  disallowedMutationTargetsAcknowledged: z.array(DisallowedAgentMutationTargetSchema).min(1),
});

export const AgentRunSchema = z.object({
  agentRunId: z.string().min(1),
  sessionId: z.string().min(1),
  brandId: z.string().min(1),
  storeId: z.string().min(1),
  opportunityGapId: z.string().min(1),
  status: AgentRunStatusSchema,
  startedAt: z.string().min(1),
  completedAt: z.string().min(1).optional(),
  provider: z.string().min(1),
  model: z.string().min(1),
  thinkingLevel: z.string().min(1).optional(),
  runtimeMode: z.enum(["pi_sdk_adapter", "fixture_adapter"]),
  promptRef: z.string().min(1),
  contextBundleVersion: z.literal("agent-context-bundle.v1"),
  contextHash: z.string().min(1),
  draft: AgentDraftOutputSchema.optional(),
  errorMessage: z.string().min(1).optional(),
  evidenceRefs: z.array(z.string().min(1)).min(1),
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

export type AgentDraftOutput = z.infer<typeof AgentDraftOutputSchema>;
export type AgentRun = z.infer<typeof AgentRunSchema>;
export type AgentRunEvent = z.infer<typeof AgentRunEventSchema>;

export type AgentRuntimeAdapterInput = {
  context: AgentContextBundle;
  allowedDraftOperations: AgentAllowedDraftOperation[];
};

export type AgentRuntimeAdapter = {
  provider: string;
  model: string;
  thinkingLevel?: string;
  runtimeMode: "pi_sdk_adapter" | "fixture_adapter";
  draft(input: AgentRuntimeAdapterInput): Promise<AgentDraftOutput>;
};

export type AgentRunAuditStore = {
  appendRun(run: AgentRun): Promise<void>;
  appendEvent(event: AgentRunEvent): Promise<void>;
  replaceRun(run: AgentRun): Promise<void>;
};

export type RunDataDynaAgentInput = {
  context: AgentContextBundle;
  adapter: AgentRuntimeAdapter;
  auditStore: AgentRunAuditStore;
  promptRef: string;
  now?: () => string;
};

export type RunDataDynaAgentResult = {
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

export async function runDataDynaAgentSidecar(input: RunDataDynaAgentInput): Promise<RunDataDynaAgentResult> {
  const context = AgentContextBundleSchema.parse(input.context);
  const now = input.now ?? (() => new Date().toISOString());
  const events: AgentRunEvent[] = [];
  const startedAt = now();
  const baseRun = AgentRunSchema.parse({
    agentRunId: context.agentRunId,
    sessionId: context.sessionId,
    brandId: context.brandId,
    storeId: context.storeId,
    opportunityGapId: context.opportunityGapId,
    status: "started",
    startedAt,
    provider: input.adapter.provider,
    model: input.adapter.model,
    thinkingLevel: input.adapter.thinkingLevel,
    runtimeMode: input.adapter.runtimeMode,
    promptRef: input.promptRef,
    contextBundleVersion: context.contractVersion,
    contextHash: stableContextHash(context),
    evidenceRefs: context.evidenceRefs,
  });
  await input.auditStore.appendRun(baseRun);
  await appendEvent(input.auditStore, events, context, "run_started", startedAt, { runtimeMode: input.adapter.runtimeMode });
  await appendEvent(input.auditStore, events, context, "context_loaded", now(), {
    metricId: context.facts.opportunityGap.metricId,
    evidenceRefCount: context.evidenceRefs.length,
  });
  await appendEvent(input.auditStore, events, context, "adapter_invoked", now(), {
    provider: input.adapter.provider,
    model: input.adapter.model,
  });

  try {
    const draft = AgentDraftOutputSchema.parse(
      await input.adapter.draft({
        context,
        allowedDraftOperations: context.allowedDraftOperations,
      }),
    );
    assertNoCoreWrites(draft);
    const completedAt = now();
    const run = AgentRunSchema.parse({
      ...baseRun,
      status: "draft_captured",
      completedAt,
      draft,
    });
    await appendEvent(input.auditStore, events, context, "draft_captured", completedAt, {
      truthStatus: draft.truthStatus,
      requestedCoreWriteCount: draft.requestedCoreWrites.length,
    });
    await input.auditStore.replaceRun(run);
    return { run, events };
  } catch (error) {
    const failedAt = now();
    const run = AgentRunSchema.parse({
      ...baseRun,
      status: "failed",
      completedAt: failedAt,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    await appendEvent(input.auditStore, events, context, "run_failed", failedAt, { errorMessage: run.errorMessage ?? "unknown" });
    await input.auditStore.replaceRun(run);
    return { run, events };
  }
}

export function createFixtureAgentRuntimeAdapter(input?: { provider?: string; model?: string; thinkingLevel?: string }): AgentRuntimeAdapter {
  return {
    provider: input?.provider ?? "fixture",
    model: input?.model ?? "fixture-pi-sdk-boundary",
    thinkingLevel: input?.thinkingLevel ?? "off",
    runtimeMode: "fixture_adapter",
    async draft({ context, allowedDraftOperations }) {
      return AgentDraftOutputSchema.parse({
        outputKind: "intervention_hypothesis_draft",
        truthStatus: "agent_draft_not_core_truth",
        hypothesis: `Explore a merchant-reviewed experiment for ${context.facts.opportunityGap.metricId} gap ${context.opportunityGapId}.`,
        reasoningSummary: "Fixture adapter used deterministic Core context only; peer comparison remains directional and non-causal.",
        draftExperimentPlan: {
          objective: `Improve ${context.facts.opportunityGap.metricId} without violating guardrails.`,
          measurementMetricId: context.facts.opportunityGap.metricId,
          guardrailMetricIds: ["refund_rate"],
          merchantReviewRequired: true,
        },
        evidenceRefs: context.evidenceRefs,
        allowedDraftOperationsUsed: allowedDraftOperations.filter((operation) => operation.startsWith("draft_")),
        requestedCoreWrites: [],
        disallowedMutationTargetsAcknowledged: context.disallowedMutationTargets,
      });
    },
  };
}

export function assertNoCoreWrites(draft: AgentDraftOutput): void {
  if (draft.truthStatus !== "agent_draft_not_core_truth") {
    throw new Error("Agent draft must not be promoted to Core truth.");
  }
  if (draft.requestedCoreWrites.length !== 0) {
    throw new Error("Agent draft requested deterministic Core writes.");
  }
}

async function appendEvent(
  store: AgentRunAuditStore,
  events: AgentRunEvent[],
  context: AgentContextBundle,
  eventType: AgentRunEventType,
  occurredAt: string,
  metadata: Record<string, JsonValue>,
): Promise<void> {
  const event = AgentRunEventSchema.parse({
    agentRunEventId: `agent_run_event:${context.agentRunId}:${events.length + 1}`,
    agentRunId: context.agentRunId,
    sessionId: context.sessionId,
    storeId: context.storeId,
    opportunityGapId: context.opportunityGapId,
    eventType,
    occurredAt,
    metadata,
  });
  events.push(event);
  await store.appendEvent(event);
}

function stableContextHash(context: AgentContextBundle): string {
  return `context_hash:${Buffer.from(JSON.stringify(context)).toString("base64url")}`;
}
