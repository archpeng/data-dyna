import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { WorkerFreshnessRecord, WorkerKind } from "../src/app/workers/index.ts";
import {
  InMemoryAgentRunAuditStore,
  runAgentAttempt,
  type AgentDraftOutput,
  type AgentHarnessCallbacks,
  type AgentRuntimePolicy,
  type SelectedAgentRuntime,
} from "../src/agent/agent-sidecar.ts";
import { createPreparedAttemptReadOnlyTools, prepareAgentAttempt, type PreparedAgentAttempt } from "../src/agent/prepared-attempt.ts";

const preparedAttempt = preparedAttemptFixture();
const tools = createPreparedAttemptReadOnlyTools(preparedAttempt);
const prompt = {
  promptRef: "prompt:data-dyna-agent-runtime:s3",
  systemInstructions: "Use only the provided read-only tools and return one draft artifact for validation.",
};
const policy: AgentRuntimePolicy = {
  policyVersion: "agent-runtime-policy.v1",
  toolCatalogVersion: "agent-read-tools.v1",
  mutationPolicy: "no_core_or_business_mutation",
  accepted: true,
  allowedToolNames: ["read_worker_freshness", "read_projection_summary", "read_benchmark_opportunity_gaps", "read_evidence_records"],
};

const callbackEvents: string[] = [];
const callbacks: AgentHarnessCallbacks = {
  onAuditEvent(event) {
    callbackEvents.push(event.eventType);
  },
  onTranscriptEvent(event) {
    callbackEvents.push(`transcript:${event.type}`);
  },
};

let runtimeInvocations = 0;
const runtime: SelectedAgentRuntime = {
  provider: "local-test-provider",
  model: "local-test-model",
  profile: "agent-runtime-s3-test",
  runtimeMode: "pi_sdk_adapter",
  authRef: "auth_ref:local-test-agent-runtime",
  async runTurn({ preparedAttempt: attempt, tools: runtimeTools }) {
    runtimeInvocations += 1;
    const projectionRef = await runtimeTools.read_worker_freshness({ workerKind: "projection" });
    const projectionSummary = await runtimeTools.read_projection_summary({ committedJobId: projectionRef.committedJobId });
    const benchmarkRef = await runtimeTools.read_worker_freshness({ workerKind: "benchmark" });
    const benchmarkSummary = await runtimeTools.read_benchmark_opportunity_gaps({ committedJobId: benchmarkRef.committedJobId });
    return {
      transcript: [
        { type: "tool_call", toolName: "read_worker_freshness", summary: "runtime selected the projection freshness tool" },
        { type: "tool_result", toolName: "read_projection_summary", summary: `runtime observed ${projectionSummary.summary.orderCount} orders` },
        { type: "tool_call", toolName: "read_benchmark_opportunity_gaps", summary: "runtime selected the benchmark gap tool" },
        { type: "tool_result", toolName: "read_benchmark_opportunity_gaps", summary: `runtime observed aggregateOnly=${benchmarkSummary.summary.aggregateOnly}` },
        { type: "draft_emitted", summary: "runtime emitted one draft artifact after its own tool choices" },
      ],
      draft: draftOutput(attempt),
    };
  },
};

const successStore = new InMemoryAgentRunAuditStore();
const success = await runAgentAttempt({
  preparedAttempt,
  prompt,
  tools,
  policy,
  runtime,
  auditStore: successStore,
  callbacks,
  now: deterministicClock(),
});

assert.equal(runtimeInvocations, 1);
assert.equal(success.run.status, "draft_captured");
assert.equal(success.run.runtimeMode, "pi_sdk_adapter");
assert.equal(success.run.provider, "local-test-provider");
assert.equal(success.run.model, "local-test-model");
assert.equal(success.run.profile, "agent-runtime-s3-test");
assert.equal(success.run.authRef, "auth_ref:local-test-agent-runtime");
assert.equal(success.run.promptRef, prompt.promptRef);
assert.equal(success.run.attemptId, preparedAttempt.attemptId);
assert.equal(success.run.contextSeedHash, preparedAttempt.contextSeedHash);
assert.equal(success.run.draft?.truthStatus, "agent_draft_not_core_truth");
assert.deepEqual(success.run.draft?.requestedCoreWrites, []);
assert.deepEqual(
  success.events.map((event) => event.eventType),
  [
    "run_started",
    "attempt_loaded",
    "policy_evaluated",
    "runtime_selected",
    "harness_invoked",
    "tool_call_attempt",
    "tool_result_sanitized",
    "tool_call_attempt",
    "tool_result_sanitized",
    "tool_call_attempt",
    "tool_result_sanitized",
    "tool_call_attempt",
    "tool_result_sanitized",
    "harness_transcript_event",
    "harness_transcript_event",
    "harness_transcript_event",
    "harness_transcript_event",
    "harness_transcript_event",
    "draft_captured",
  ],
);
assert.deepEqual(
  success.events.filter((event) => event.eventType === "harness_transcript_event").map((event) => event.metadata.type),
  ["tool_call", "tool_result", "tool_call", "tool_result", "draft_emitted"],
);
assert.equal(successStore.runs.get(preparedAttempt.agentRunId)?.status, "draft_captured");
assert.deepEqual(callbackEvents.filter((event) => event.startsWith("transcript:")), [
  "transcript:tool_call",
  "transcript:tool_result",
  "transcript:tool_call",
  "transcript:tool_result",
  "transcript:draft_emitted",
]);
assert.ok(callbackEvents.includes("harness_invoked"));
assert.doesNotMatch(JSON.stringify(success), /secret=|bearer|sk-/i);

const missingPrompt = await runAgentAttempt({
  preparedAttempt: { ...preparedAttempt, agentRunId: "agent_run:s3:missing-prompt" },
  prompt: { promptRef: "", systemInstructions: "" },
  tools,
  policy,
  runtime,
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(),
});
assert.equal(missingPrompt.run.status, "failed");
assert.equal(runtimeInvocations, 1);
assert.match(missingPrompt.run.errorMessage ?? "", /Too small|at least 1 character/);

const missingRuntime = await runAgentAttempt({
  preparedAttempt: { ...preparedAttempt, agentRunId: "agent_run:s3:missing-runtime" },
  prompt,
  tools,
  policy,
  runtime: { ...runtime, provider: "" },
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(),
});
assert.equal(missingRuntime.run.status, "failed");
assert.equal(missingRuntime.run.provider, "unselected");
assert.equal(runtimeInvocations, 1);

const missingModel = await runAgentAttempt({
  preparedAttempt: { ...preparedAttempt, agentRunId: "agent_run:s3:missing-model" },
  prompt,
  tools,
  policy,
  runtime: { ...runtime, model: "" },
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(),
});
assert.equal(missingModel.run.status, "failed");
assert.equal(missingModel.run.model, "unselected");
assert.equal(runtimeInvocations, 1);

const missingProfile = await runAgentAttempt({
  preparedAttempt: { ...preparedAttempt, agentRunId: "agent_run:s3:missing-profile" },
  prompt,
  tools,
  policy,
  runtime: { ...runtime, profile: "" },
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(),
});
assert.equal(missingProfile.run.status, "failed");
assert.equal(missingProfile.run.profile, "unselected");
assert.equal(runtimeInvocations, 1);

const missingCallbacks = await runAgentAttempt({
  preparedAttempt: { ...preparedAttempt, agentRunId: "agent_run:s3:missing-callbacks" },
  prompt,
  tools,
  policy,
  runtime,
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks: {} as AgentHarnessCallbacks,
  now: deterministicClock(),
});
assert.equal(missingCallbacks.run.status, "failed");
assert.match(missingCallbacks.run.errorMessage ?? "", /requires audit and transcript callbacks/);
assert.equal(runtimeInvocations, 1);

const missingHarness = await runAgentAttempt({
  preparedAttempt: { ...preparedAttempt, agentRunId: "agent_run:s3:missing-harness" },
  prompt,
  tools,
  policy,
  runtime: { ...runtime, runTurn: undefined } as unknown as SelectedAgentRuntime,
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(),
});
assert.equal(missingHarness.run.status, "failed");
assert.match(missingHarness.run.errorMessage ?? "", /missing the harness turn callback/);
assert.equal(runtimeInvocations, 1);

const missingAuth = await runAgentAttempt({
  preparedAttempt: { ...preparedAttempt, agentRunId: "agent_run:s3:missing-auth" },
  prompt,
  tools,
  policy,
  runtime: { ...runtime, authRef: "" },
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(),
});
assert.equal(missingAuth.run.status, "failed");
assert.equal(runtimeInvocations, 1);

const wrongPolicy = await runAgentAttempt({
  preparedAttempt: { ...preparedAttempt, agentRunId: "agent_run:s3:wrong-policy" },
  prompt,
  tools,
  policy: { ...policy, toolCatalogVersion: "wrong-catalog" as AgentRuntimePolicy["toolCatalogVersion"] },
  runtime,
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(),
});
assert.equal(wrongPolicy.run.status, "failed");
assert.equal(runtimeInvocations, 1);
assert.match(wrongPolicy.run.errorMessage ?? "", /Invalid input|tool catalog/);

const blockedAttempt = await runAgentAttempt({
  preparedAttempt: { ...preparedAttempt, status: "blocked_policy" },
  prompt,
  tools,
  policy,
  runtime,
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(),
});
assert.equal(blockedAttempt.run.status, "failed");
assert.equal(runtimeInvocations, 1);
assert.match(blockedAttempt.run.errorMessage ?? "", /not consumable/);

const providerFailure = await runAgentAttempt({
  preparedAttempt: { ...preparedAttempt, agentRunId: "agent_run:s3:provider-failure" },
  prompt,
  tools,
  policy,
  runtime: {
    ...runtime,
    async runTurn() {
      throw new Error("provider unavailable secret=abc123 bearer token");
    },
  },
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(),
});
assert.equal(providerFailure.run.status, "failed");
assert.match(providerFailure.run.errorMessage ?? "", /provider unavailable/);
assert.doesNotMatch(JSON.stringify(providerFailure), /abc123|bearer token|secret=abc123/i);
assert.equal(providerFailure.events.at(-1)?.eventType, "run_failed");

const invalidWrite = await runAgentAttempt({
  preparedAttempt: { ...preparedAttempt, agentRunId: "agent_run:s3:invalid-write" },
  prompt,
  tools,
  policy,
  runtime: {
    ...runtime,
    async runTurn({ preparedAttempt: attempt }) {
      return {
        transcript: [{ type: "draft_emitted", summary: "runtime emitted an invalid draft" }],
        draft: { ...draftOutput(attempt), requestedCoreWrites: ["metrics"] } as unknown as AgentDraftOutput,
      };
    },
  },
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(),
});
assert.equal(invalidWrite.run.status, "failed");
assert.match(invalidWrite.run.errorMessage ?? "", /Never|never|Expected/);

const source = readFileSync("src/agent/agent-sidecar.ts", "utf8");
assert.doesNotMatch(source, /adapter\.draft|createFixtureAgentRuntimeAdapter|fixture_adapter|AgentRuntimeAdapter/);
assert.match(source, /runAgentAttempt/);

function preparedAttemptFixture(): PreparedAgentAttempt {
  const prepared = prepareAgentAttempt({
    attemptId: "prepared_attempt:brand-1:store-target:gap-aov:s3",
    agentRunId: "agent_run:brand-1:store-target:gap-aov:s3",
    sessionId: "agent_session:brand-1:store-target:gap-aov:s3",
    brandId: "brand-1",
    storeId: "store-target",
    opportunityGapId: "opportunity_gap:brand-1:store-target:2026-05-02:avg_order_value",
    requestedBy: "system:test",
    createdAt: "2026-05-02T00:00:00.000Z",
    identitySource: "deterministic_tenant_scope",
    freshnessRecords: freshnessRecords(),
    contextBudget: { maxSeedBytes: 8192, maxToolResultBytes: 2048 },
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
    reasoningSummary: "Runtime used its selected read-only tool order; peer comparison remains directional and non-causal.",
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
