import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { OpportunityGap } from "../src/benchmarks/opportunity-gaps.ts";
import type { WorkerFreshnessRecord, WorkerKind } from "../src/app/workers/index.ts";
import { buildAgentContextBundle } from "../src/agent/context-bundle.ts";
import {
  InMemoryAgentRunAuditStore,
  runAgentAttempt,
  type AgentDraftOutput,
  type AgentHarnessCallbacks,
  type AgentRuntimePolicy,
  type AgentRuntimeUsage,
  type SelectedAgentRuntime,
} from "../src/agent/agent-sidecar.ts";
import {
  buildAgentRuntimeObservabilityReport,
  type AgentRuntimeDeletionProof,
} from "../src/agent/observability.ts";
import { createPreparedAttemptReadOnlyTools, prepareAgentAttempt, type PreparedAgentAttempt } from "../src/agent/prepared-attempt.ts";
import {
  evaluateAgentDraftResultGate,
  requestMerchantReviewForAgentDraft,
} from "../src/agent/result-boundary.ts";

const context = buildAgentContextBundle({
  agentRunId: "agent_run:brand-1:store-target:gap-aov:s6:success",
  sessionId: "agent_session:brand-1:store-target:gap-aov:s6",
  opportunityGap: opportunityGapFixture(),
  createdAt: "2026-05-02T00:00:00.000Z",
});
const callbacks: AgentHarnessCallbacks = {
  onAuditEvent() {},
  onTranscriptEvent() {},
};
const policy: AgentRuntimePolicy = {
  policyVersion: "agent-runtime-policy.v1",
  toolCatalogVersion: "agent-read-tools.v1",
  mutationPolicy: "no_core_or_business_mutation",
  accepted: true,
  allowedToolNames: ["read_worker_freshness", "read_benchmark_opportunity_gaps"],
};
const prompt = {
  promptRef: "prompt:data-dyna-agent-runtime:s6",
  systemInstructions: "Use only read-only tools; emit an untrusted draft for deterministic validation.",
};

const successAttempt = preparedAttemptFixture(context.agentRunId);
const successStore = new InMemoryAgentRunAuditStore();
const success = await runAgentAttempt({
  preparedAttempt: successAttempt,
  prompt,
  tools: createPreparedAttemptReadOnlyTools(successAttempt),
  policy,
  runtime: runtimeReturning(draftOutput(successAttempt, context.evidenceRefs), {
    inputTokens: 120,
    outputTokens: 80,
    totalTokens: 200,
    estimatedCostMicros: 17,
    currency: "USD",
  }),
  auditStore: successStore,
  callbacks,
  now: deterministicClock(),
});
assert.equal(success.run.status, "draft_captured");
assert.equal(success.run.runtimeUsage?.totalTokens, 200);

const reviewRequest = await requestMerchantReviewForAgentDraft({
  run: success.run,
  context,
  auditStore: successStore,
  reviewId: "experiment_review:brand-1:store-target:plan-aov:s6",
  submittedAt: "2026-05-02T01:00:00.000Z",
  now: deterministicClock(30),
});
assert.equal(reviewRequest.gate.status, "validated_for_review_request");
assert.equal(reviewRequest.submission.reviewStatus, "submitted_for_review");

const deniedAttempt = preparedAttemptFixture("agent_run:brand-1:store-target:gap-aov:s6:denied-tool");
const denied = await runAgentAttempt({
  preparedAttempt: deniedAttempt,
  prompt,
  tools: createPreparedAttemptReadOnlyTools(deniedAttempt),
  policy: { ...policy, allowedToolNames: ["read_worker_freshness"] },
  runtime: {
    ...runtimeReturning(draftOutput(deniedAttempt, context.evidenceRefs)),
    async runTurn({ tools }) {
      await tools.read_benchmark_opportunity_gaps({ committedJobId: "worker_job:benchmark:s6" });
      throw new Error("unreachable after denied tool call");
    },
  },
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(60),
});
assert.equal(denied.run.status, "failed");
assert.equal(denied.events.find((event) => event.eventType === "tool_call_denied")?.metadata.reason, "tool_not_allowed_by_runtime_policy");

const providerFailureAttempt = preparedAttemptFixture("agent_run:brand-1:store-target:gap-aov:s6:provider-failure");
const providerFailure = await runAgentAttempt({
  preparedAttempt: providerFailureAttempt,
  prompt,
  tools: createPreparedAttemptReadOnlyTools(providerFailureAttempt),
  policy,
  runtime: {
    ...runtimeReturning(draftOutput(providerFailureAttempt, context.evidenceRefs)),
    async runTurn() {
      throw new Error("provider unavailable secret=abc123 bearer token raw-payload paymentId=payment-123 customerPhone=13800000000 sk-test-key");
    },
  },
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(90),
});
assert.equal(providerFailure.run.status, "failed");
assert.doesNotMatch(JSON.stringify(providerFailure), /abc123|bearer token|raw-payload|payment-123|13800000000|sk-test-key/i);

const sensitivePromptAttempt = preparedAttemptFixture("agent_run:brand-1:store-target:gap-aov:s6:sensitive-prompt");
const sensitivePrompt = await runAgentAttempt({
  preparedAttempt: sensitivePromptAttempt,
  prompt: { ...prompt, systemInstructions: "Do not persist secret=prompt-secret raw-payload customerPhone=13800000000" },
  tools: createPreparedAttemptReadOnlyTools(sensitivePromptAttempt),
  policy,
  runtime: runtimeReturning(draftOutput(sensitivePromptAttempt, context.evidenceRefs)),
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(105),
});
assert.equal(sensitivePrompt.run.status, "failed");
assert.doesNotMatch(JSON.stringify(sensitivePrompt), /prompt-secret|raw-payload|13800000000/i);

const rejectedAttempt = preparedAttemptFixture("agent_run:brand-1:store-target:gap-aov:s6:validator-rejected");
const rejectedRun = await runAgentAttempt({
  preparedAttempt: rejectedAttempt,
  prompt,
  tools: createPreparedAttemptReadOnlyTools(rejectedAttempt),
  policy,
  runtime: runtimeReturning(draftOutput(rejectedAttempt, ["evidence:llm-invented-fact"])),
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(120),
});
const rejectedStore = new InMemoryAgentRunAuditStore();
const rejectedGate = await evaluateAgentDraftResultGate({
  run: rejectedRun.run,
  context: { ...context, agentRunId: rejectedRun.run.agentRunId },
  auditStore: rejectedStore,
  now: deterministicClock(150),
});
assert.equal(rejectedGate.status, "blocked");

const deletionProof = buildDeletionProof();
const report = buildAgentRuntimeObservabilityReport({
  run: success.run,
  events: [
    ...successStore.events,
    ...denied.events,
    ...providerFailure.events,
    ...sensitivePrompt.events,
    ...rejectedStore.events,
  ],
  deletionProof,
});

assert.equal(report.auditCoverage.preparedAttempt, true);
assert.equal(report.auditCoverage.policyEvaluation, true);
assert.equal(report.auditCoverage.toolDenials, true);
assert.equal(report.auditCoverage.sanitizedToolResults, true);
assert.equal(report.auditCoverage.draftCapture, true);
assert.equal(report.auditCoverage.validatorOutcome, true);
assert.equal(report.auditCoverage.reviewHandoffRequest, true);
assert.equal(report.auditCoverage.providerOrRuntimeFailure, true);
assert.equal(report.metricCounters.validationAccepted, 1);
assert.equal(report.metricCounters.validationBlocked, 1);
assert.equal(report.metricCounters.reviewRequests, 1);
assert.equal(report.runtimeUsage.available, true);
assert.equal(report.deletionProof?.removedSurfaces.every((surface) => surface.productionMatches === 0), true);

console.log("Agent runtime observability probe passed:");
console.log(JSON.stringify(report, null, 2));

function buildDeletionProof(): AgentRuntimeDeletionProof {
  const productionFiles = readdirSync(new URL("../src/agent", import.meta.url), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => join("src/agent", entry.name));
  const testFiles = [
    "tests/agent-runtime-harness-s3.spec.ts",
    "tests/agent-runtime-tool-boundary-s4.spec.ts",
    "tests/agent-runtime-result-boundary-s5.spec.ts",
    "tests/support/experiment-plan-fixture.ts",
  ];
  const surfaces = [
    "adapter.draft(",
    "AgentRuntimeAdapter",
    "createFixtureAgentRuntimeAdapter",
    "fixture_adapter",
    "draftFixtureExperimentPlanFromContext",
    "submit_for_merchant_review",
  ];

  return {
    removedSurfaces: surfaces.map((surface) => {
      const productionMatches = countMatches(productionFiles, surface);
      assert.equal(productionMatches, 0, `${surface} must not remain reachable in production Agent code`);
      return {
        surface,
        productionMatches,
        testMatches: countMatches(testFiles, surface),
        status: "removed_from_production",
      };
    }),
    residuals: [
      "live provider credentials and production deployment are residual",
      "production dashboards/SLOs/paging/incidents are residual",
    ],
  };
}

function countMatches(files: string[], needle: string): number {
  return files.reduce((count, file) => {
    try {
      return count + occurrences(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), needle);
    } catch {
      return count;
    }
  }, 0);
}

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

function runtimeReturning(draft: AgentDraftOutput, runtimeUsage?: AgentRuntimeUsage): SelectedAgentRuntime {
  return {
    provider: "local-test-provider",
    model: "local-test-model",
    profile: "agent-runtime-s6-test",
    runtimeMode: "pi_sdk_adapter",
    authRef: "auth_ref:local-test-agent-runtime",
    async runTurn({ tools }) {
      const benchmarkRef = await tools.read_worker_freshness({ workerKind: "benchmark" });
      await tools.read_benchmark_opportunity_gaps({ committedJobId: benchmarkRef.committedJobId });
      return {
        transcript: [
          { type: "tool_call", toolName: "read_worker_freshness", summary: "runtime selected benchmark freshness" },
          { type: "tool_result", toolName: "read_benchmark_opportunity_gaps", summary: "runtime inspected bounded aggregate evidence" },
          { type: "draft_emitted", summary: "runtime emitted an untrusted draft artifact" },
        ],
        draft,
        runtimeUsage,
      };
    },
  };
}

function draftOutput(attempt: PreparedAgentAttempt, evidenceRefs: string[]): AgentDraftOutput {
  return {
    outputKind: "intervention_hypothesis_draft",
    truthStatus: "agent_draft_not_core_truth",
    hypothesis: `Explore merchant-reviewed intervention for ${attempt.opportunityGapId}.`,
    reasoningSummary: "Runtime stayed inside the local/test observability proof boundary.",
    draftExperimentPlan: {
      objective: "Improve avg_order_value without violating refund_rate guardrails.",
      measurementMetricId: "avg_order_value",
      guardrailMetricIds: ["refund_rate"],
      merchantReviewRequired: true,
    },
    evidenceRefs,
    allowedDraftOperationsUsed: ["draft_hypothesis", "draft_experiment_plan", "request_merchant_review_gate"],
    requestedCoreWrites: [],
    disallowedMutationTargetsAcknowledged: ["orders", "metrics", "benchmarks", "evidence_facts", "menu", "price", "coupon", "customer_message_execution"],
  };
}

function preparedAttemptFixture(agentRunId: string): PreparedAgentAttempt {
  const prepared = prepareAgentAttempt({
    attemptId: `prepared_attempt:${agentRunId}`,
    agentRunId,
    sessionId: "agent_session:brand-1:store-target:gap-aov:s6",
    brandId: "brand-1",
    storeId: "store-target",
    opportunityGapId: context.opportunityGapId,
    requestedBy: "system:test",
    createdAt: "2026-05-02T00:00:00.000Z",
    identitySource: "deterministic_tenant_scope",
    freshnessRecords: freshnessRecords(),
    contextBudget: { maxSeedBytes: 8192, maxToolResultBytes: 4096 },
    evidenceRefs: context.evidenceRefs,
    assumptions: ["Peer benchmark comparison is directional and non-causal."],
    minimumCommittedAt: "2026-05-02T00:00:00.000Z",
  });
  assert.equal(prepared.status, "prepared");
  return prepared;
}

function opportunityGapFixture(): OpportunityGap {
  return {
    opportunityGapId: "opportunity_gap:brand-1:store-target:2026-05-02:avg_order_value",
    brandId: "brand-1",
    storeId: "store-target",
    snapshotDate: "2026-05-02",
    segmentCandidateId: "restaurant_segment:brand-1:store-target:2026-05-02:independent_cafe_core",
    segmentLabel: "independent_cafe_core",
    metricId: "avg_order_value",
    metricWindow: "snapshot",
    guardrailRelation: "growth_metric",
    targetValue: 50,
    peerMedianValue: 60,
    peerP75Value: 70,
    comparisonBasis: "peer_p75",
    direction: "higher_is_better",
    gapValue: 20,
    gapRatio: 0.2857,
    rank: 1,
    confidence: 0.7,
    sampleStatus: "sufficient",
    interpretation: "directional_non_causal_gap",
    evidenceRefs: [
      "metric:brand-1:store-target:2026-05-02:avg_order_value",
      "peer_benchmark:2026-05-02:independent_cafe_core:avg_order_value:snapshot",
      "peer_group:2026-05-02:independent_cafe_core:avg_order_value:snapshot",
      "restaurant_segment:brand-1:store-target:2026-05-02:independent_cafe_core",
    ],
  };
}

function freshnessRecords(): WorkerFreshnessRecord[] {
  return [
    freshnessRecord("projection", "worker_job:projection:s6", { sessionCount: 40, orderCount: 20, avgOrderValue: 50 }),
    freshnessRecord("snapshot", "worker_job:snapshot:s6", { snapshotDate: "2026-05-02", metricCount: 8, confirmedSegmentCount: 1 }),
    freshnessRecord("benchmark", "worker_job:benchmark:s6", { gapCount: 1, peerSampleStatus: "sufficient", aggregateOnly: true }),
    freshnessRecord("evidence", "worker_job:evidence:s6", { evidenceCount: 2, verdictSummary: "deterministic_records_only" }),
  ];
}

function freshnessRecord(workerKind: WorkerKind, committedJobId: string, outputSummary: Record<string, unknown>): WorkerFreshnessRecord {
  return {
    checkpointId: `checkpoint:${workerKind}:s6`,
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

function deterministicClock(startTick = 0): () => string {
  let tick = startTick;
  return () => `2026-05-02T00:00:${String(tick++).padStart(2, "0")}.000Z`;
}
