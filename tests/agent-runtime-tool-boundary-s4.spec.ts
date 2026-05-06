import assert from "node:assert/strict";
import type { WorkerFreshnessRecord, WorkerKind } from "../src/app/workers/index.ts";
import {
  InMemoryAgentRunAuditStore,
  runAgentAttempt,
  type AgentDraftOutput,
  type AgentHarnessCallbacks,
  type AgentRuntimePolicy,
  type AgentRuntimeToolSurface,
  type SelectedAgentRuntime,
} from "../src/agent/agent-sidecar.ts";
import {
  createPreparedAttemptReadOnlyTools,
  prepareAgentAttempt,
  type PreparedAgentAttempt,
  type PreparedAttemptReadOnlyToolSurface,
} from "../src/agent/prepared-attempt.ts";

const preparedAttempt = preparedAttemptFixture();
const baseTools = createPreparedAttemptReadOnlyTools(preparedAttempt);
const prompt = {
  promptRef: "prompt:data-dyna-agent-runtime:s4",
  systemInstructions: "Use only allowed runtime tools; tool policy cannot be expanded by the provider.",
};
const policy: AgentRuntimePolicy = {
  policyVersion: "agent-runtime-policy.v1",
  toolCatalogVersion: "agent-read-tools.v1",
  mutationPolicy: "no_core_or_business_mutation",
  accepted: true,
  allowedToolNames: ["read_worker_freshness", "read_projection_summary"],
};
const callbacks: AgentHarnessCallbacks = {
  onAuditEvent() {},
  onTranscriptEvent() {},
};

let runtimeInvocations = 0;
const acceptedRuntime: SelectedAgentRuntime = {
  provider: "local-test-provider",
  model: "local-test-model",
  profile: "agent-runtime-s4-test",
  runtimeMode: "pi_sdk_adapter",
  authRef: "auth_ref:local-test-agent-runtime",
  async runTurn({ preparedAttempt: attempt, tools }) {
    runtimeInvocations += 1;
    const projectionRef = await tools.read_worker_freshness({ workerKind: "projection" });
    const projectionSummary = await tools.read_projection_summary({ committedJobId: projectionRef.committedJobId });
    assert.equal(projectionSummary.summary.orderCount, 20);
    return {
      transcript: [
        { type: "tool_call", toolName: "read_worker_freshness", summary: "runtime chose an allowed freshness read" },
        { type: "tool_result", toolName: "read_projection_summary", summary: "runtime received a bounded sanitized result" },
        { type: "draft_emitted", summary: "runtime emitted a draft after allowed tools only" },
      ],
      draft: draftOutput(attempt),
    };
  },
};

const success = await runAgentAttempt({
  preparedAttempt,
  prompt,
  tools: baseTools,
  policy,
  runtime: acceptedRuntime,
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(),
});
assert.equal(success.run.status, "draft_captured");
assert.equal(runtimeInvocations, 1);
assert.deepEqual(success.events.find((event) => event.eventType === "policy_evaluated")?.metadata.allowedToolNames, policy.allowedToolNames);
assert.equal(success.events.find((event) => event.eventType === "policy_evaluated")?.metadata.mutationPolicy, "no_core_or_business_mutation");
assert.deepEqual(
  success.events.filter((event) => event.eventType === "tool_call_attempt").map((event) => event.metadata.toolName),
  ["read_worker_freshness", "read_projection_summary"],
);
assert.deepEqual(
  success.events.filter((event) => event.eventType === "tool_result_sanitized").map((event) => event.metadata.toolName),
  ["read_worker_freshness", "read_projection_summary"],
);
assert.doesNotMatch(JSON.stringify(success), /secret=|bearer token|sk-/i);

let deniedUnderlyingSnapshotCalls = 0;
const countedTools: PreparedAttemptReadOnlyToolSurface = {
  ...baseTools,
  read_snapshot_summary(input) {
    deniedUnderlyingSnapshotCalls += 1;
    return baseTools.read_snapshot_summary(input);
  },
};
const deniedToolCall = await runAgentAttempt({
  preparedAttempt: { ...preparedAttempt, agentRunId: "agent_run:s4:denied-tool-call" },
  prompt,
  tools: countedTools,
  policy,
  runtime: {
    ...acceptedRuntime,
    async runTurn({ preparedAttempt: attempt, tools }) {
      runtimeInvocations += 1;
      await tools.read_snapshot_summary({ committedJobId: "worker_job:snapshot:001" });
      return { transcript: [], draft: draftOutput(attempt) };
    },
  },
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(),
});
assert.equal(deniedToolCall.run.status, "failed");
assert.equal(deniedUnderlyingSnapshotCalls, 0);
assert.equal(deniedToolCall.events.find((event) => event.eventType === "tool_call_denied")?.metadata.toolName, "read_snapshot_summary");
assert.equal(deniedToolCall.events.find((event) => event.eventType === "tool_call_denied")?.metadata.reason, "tool_not_allowed_by_runtime_policy");
assert.equal(deniedToolCall.events.some((event) => event.eventType === "draft_captured"), false);

const overrideAttempt = await runAgentAttempt({
  preparedAttempt: { ...preparedAttempt, agentRunId: "agent_run:s4:provider-policy-override" },
  prompt,
  tools: countedTools,
  policy,
  runtime: {
    ...acceptedRuntime,
    async runTurn({ preparedAttempt: attempt, tools, policy }) {
      runtimeInvocations += 1;
      assert.throws(() => policy.allowedToolNames.push("read_snapshot_summary"));
      await tools.read_snapshot_summary({ committedJobId: "worker_job:snapshot:001" });
      return { transcript: [], draft: draftOutput(attempt) };
    },
  },
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(),
});
assert.equal(overrideAttempt.run.status, "failed");
assert.equal(deniedUnderlyingSnapshotCalls, 0);
assert.match(overrideAttempt.run.errorMessage ?? "", /denied tool call/);

const unknownSurfaceTools = {
  ...baseTools,
  arbitrary_sql() {
    throw new Error("must not execute");
  },
} as PreparedAttemptReadOnlyToolSurface;
const unknownSurface = await runAgentAttempt({
  preparedAttempt: { ...preparedAttempt, agentRunId: "agent_run:s4:unknown-tool-surface" },
  prompt,
  tools: unknownSurfaceTools,
  policy,
  runtime: acceptedRuntime,
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(),
});
assert.equal(unknownSurface.run.status, "failed");
assert.match(unknownSurface.run.errorMessage ?? "", /unregistered tool: arbitrary_sql/);
assert.equal(unknownSurface.events.some((event) => event.eventType === "harness_invoked"), false);
assert.equal(runtimeInvocations, 3);

const obsoleteAliasPolicy = await runAgentAttempt({
  preparedAttempt: { ...preparedAttempt, agentRunId: "agent_run:s4:obsolete-alias-policy" },
  prompt,
  tools: baseTools,
  policy: { ...policy, allowedToolNames: ["draft_experiment_plan"] } as unknown as AgentRuntimePolicy,
  runtime: acceptedRuntime,
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(),
});
assert.equal(obsoleteAliasPolicy.run.status, "failed");
assert.match(obsoleteAliasPolicy.run.errorMessage ?? "", /Invalid option|Invalid input/);
assert.equal(obsoleteAliasPolicy.events.some((event) => event.eventType === "harness_invoked"), false);
assert.equal(runtimeInvocations, 3);

const secretToolResultSeenByRuntime: string[] = [];
const secretRawTools: PreparedAttemptReadOnlyToolSurface = {
  ...baseTools,
  read_projection_summary(input) {
    return {
      ...baseTools.read_projection_summary(input),
      summary: { note: "provider should see secret=abc123 bearer token redacted" },
    };
  },
};
const secretResult = await runAgentAttempt({
  preparedAttempt: { ...preparedAttempt, agentRunId: "agent_run:s4:secret-tool-result" },
  prompt,
  tools: secretRawTools,
  policy,
  runtime: {
    ...acceptedRuntime,
    async runTurn({ preparedAttempt: attempt, tools }) {
      runtimeInvocations += 1;
      const projection = await tools.read_projection_summary({ committedJobId: "worker_job:projection:001" });
      secretToolResultSeenByRuntime.push(String(projection.summary.note));
      return { transcript: [{ type: "draft_emitted", summary: "runtime emitted a draft from sanitized tool output" }], draft: draftOutput(attempt) };
    },
  },
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(),
});
assert.equal(secretResult.run.status, "draft_captured");
assert.deepEqual(secretToolResultSeenByRuntime, ["provider should see secret=[redacted] bearer [redacted] redacted"]);
assert.equal(secretResult.events.find((event) => event.eventType === "tool_result_sanitized")?.metadata.toolName, "read_projection_summary");
assert.doesNotMatch(JSON.stringify(secretResult), /secret=abc123|bearer token/i);

function preparedAttemptFixture(): PreparedAgentAttempt {
  const prepared = prepareAgentAttempt({
    attemptId: "prepared_attempt:brand-1:store-target:gap-aov:s4",
    agentRunId: "agent_run:brand-1:store-target:gap-aov:s4",
    sessionId: "agent_session:brand-1:store-target:gap-aov:s4",
    brandId: "brand-1",
    storeId: "store-target",
    opportunityGapId: "opportunity_gap:brand-1:store-target:2026-05-02:avg_order_value",
    requestedBy: "system:test",
    createdAt: "2026-05-02T00:00:00.000Z",
    identitySource: "deterministic_tenant_scope",
    freshnessRecords: freshnessRecords(),
    contextBudget: { maxSeedBytes: 8192, maxToolResultBytes: 4096 },
    evidenceRefs: ["evidence:brand-1:store-target:gap-aov:001"],
    assumptions: ["Peer benchmark comparison is directional and non-causal."],
    minimumCommittedAt: "2026-05-02T00:00:00.000Z",
  });
  assert.equal(prepared.status, "prepared");
  return prepared;
}

function draftOutput(attempt: PreparedAgentAttempt): AgentDraftOutput {
  return {
    outputKind: "intervention_hypothesis_draft",
    truthStatus: "agent_draft_not_core_truth",
    hypothesis: `Explore merchant-reviewed intervention for ${attempt.opportunityGapId}.`,
    reasoningSummary: "Runtime stayed inside the default-deny tool boundary.",
    draftExperimentPlan: {
      objective: "Improve avg_order_value without violating guardrails.",
      measurementMetricId: "avg_order_value",
      guardrailMetricIds: ["refund_rate"],
      merchantReviewRequired: true,
    },
    evidenceRefs: attempt.contextSeed?.evidenceRefs ?? ["evidence:brand-1:store-target:gap-aov:001"],
    allowedDraftOperationsUsed: ["draft_hypothesis", "draft_experiment_plan"],
    requestedCoreWrites: [],
    disallowedMutationTargetsAcknowledged: ["orders", "metrics", "benchmarks", "evidence_facts", "menus", "prices", "coupons"],
  };
}

function freshnessRecords(): WorkerFreshnessRecord[] {
  return [
    freshnessRecord("projection", "worker_job:projection:001", { sessionCount: 40, orderCount: 20, avgOrderValue: 50 }),
    freshnessRecord("snapshot", "worker_job:snapshot:001", { snapshotDate: "2026-05-02", metricCount: 8, confirmedSegmentCount: 1 }),
    freshnessRecord("benchmark", "worker_job:benchmark:001", { gapCount: 1, peerSampleStatus: "sufficient", aggregateOnly: true }),
    freshnessRecord("evidence", "worker_job:evidence:001", { evidenceCount: 2, verdictSummary: "deterministic_records_only" }),
  ];
}

function freshnessRecord(workerKind: WorkerKind, committedJobId: string, outputSummary: Record<string, unknown>): WorkerFreshnessRecord {
  return {
    checkpointId: `checkpoint:${workerKind}:001`,
    workerKind,
    tenantScope: { brandId: "brand-1", storeId: "store-target" },
    sourceScope: { source: "pos", producerService: "pos-lite", producerEnvironment: "test" },
    committedWatermark: { through: "2026-05-02T00:00:00.000Z" },
    committedJobId,
    committedAttemptId: 1,
    outputSummary,
    committedAt: "2026-05-02T00:00:00.000Z",
    updatedAt: "2026-05-02T00:00:00.000Z",
  };
}

function deterministicClock(): () => string {
  let tick = 0;
  return () => `2026-05-02T00:00:${String(tick++).padStart(2, "0")}.000Z`;
}
