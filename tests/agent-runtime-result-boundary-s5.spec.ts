import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { OpportunityGap } from "../src/benchmarks/opportunity-gaps.ts";
import type { WorkerFreshnessRecord, WorkerKind } from "../src/app/workers/index.ts";
import { buildAgentContextBundle } from "../src/agent/context-bundle.ts";
import {
  InMemoryAgentRunAuditStore,
  runAgentAttempt,
  type AgentDraftOutput,
  type AgentHarnessCallbacks,
  type AgentRuntimePolicy,
  type SelectedAgentRuntime,
} from "../src/agent/agent-sidecar.ts";
import { createPreparedAttemptReadOnlyTools, prepareAgentAttempt, type PreparedAgentAttempt } from "../src/agent/prepared-attempt.ts";
import {
  evaluateAgentDraftResultGate,
  requestMerchantReviewForAgentDraft,
} from "../src/agent/result-boundary.ts";
import { submitExperimentPlanForMerchantReview } from "../src/merchant-review/experiment-review.ts";

const opportunityGap: OpportunityGap = {
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

const context = buildAgentContextBundle({
  agentRunId: "agent_run:brand-1:store-target:gap-aov:s5",
  sessionId: "agent_session:brand-1:store-target:gap-aov:s5",
  opportunityGap,
  createdAt: "2026-05-02T00:00:00.000Z",
});
const preparedAttempt = preparedAttemptFixture(context.agentRunId);
const tools = createPreparedAttemptReadOnlyTools(preparedAttempt);
const prompt = {
  promptRef: "prompt:data-dyna-agent-runtime:s5",
  systemInstructions: "Return an untrusted draft only; Data Dyna will validate result gates after the harness turn.",
};
const policy: AgentRuntimePolicy = {
  policyVersion: "agent-runtime-policy.v1",
  toolCatalogVersion: "agent-read-tools.v1",
  mutationPolicy: "no_core_or_business_mutation",
  accepted: true,
  allowedToolNames: ["read_worker_freshness", "read_benchmark_opportunity_gaps"],
};
const callbacks: AgentHarnessCallbacks = {
  onAuditEvent() {},
  onTranscriptEvent() {},
};

const experimentPlanSource = readFileSync(new URL("../src/agent/experiment-plan.ts", import.meta.url), "utf8");
assert.doesNotMatch(experimentPlanSource, /draftFixtureExperimentPlanFromContext/, "production Agent plan module must not keep the old static fixture draft path");

const auditStore = new InMemoryAgentRunAuditStore();
const captured = await runAgentAttempt({
  preparedAttempt,
  prompt,
  tools,
  policy,
  runtime: runtimeReturning(draftOutput(preparedAttempt, context.evidenceRefs)),
  auditStore,
  callbacks,
  now: deterministicClock(),
});
assert.equal(captured.run.status, "draft_captured");
assert.equal(auditStore.events.some((event) => event.eventType === "merchant_review_requested"), false);

const reviewRequest = await requestMerchantReviewForAgentDraft({
  run: captured.run,
  context,
  auditStore,
  reviewId: "experiment_review:brand-1:store-target:plan-aov:s5",
  submittedAt: "2026-05-02T01:00:00.000Z",
  now: deterministicClock(),
});
assert.equal(reviewRequest.gate.status, "validated_for_review_request");
assert.equal(reviewRequest.gate.validationResult.decision, "accept");
assert.equal(reviewRequest.gate.artifacts.hypothesis.truthStatus, "agent_draft_not_core_truth");
assert.equal(reviewRequest.gate.artifacts.experimentPlan.truthStatus, "agent_draft_not_core_truth");
assert.deepEqual(reviewRequest.gate.artifacts.experimentPlan.requestedCoreWrites, []);
assert.equal(reviewRequest.submission.reviewStatus, "submitted_for_review");
assert.equal(reviewRequest.submission.lifecycleState, "drafted");
assert.equal(reviewRequest.submission.submittedBy.actorType, "system");
assert.deepEqual(reviewRequest.submission.evidenceRefs, reviewRequest.gate.artifacts.experimentPlan.evidenceRefs);
assert.equal(auditStore.events.find((event) => event.eventType === "draft_validation_evaluated")?.metadata.decision, "accept");
assert.equal(auditStore.events.find((event) => event.eventType === "merchant_review_requested")?.metadata.businessMutationCalled, false);
assert.equal(auditStore.events.find((event) => event.eventType === "merchant_review_requested")?.metadata.merchantApprovalImplied, false);

const missingEvidenceRun = await runAgentAttempt({
  preparedAttempt: preparedAttemptFixture("agent_run:brand-1:store-target:gap-aov:s5:missing-evidence"),
  prompt,
  tools: createPreparedAttemptReadOnlyTools(preparedAttemptFixture("agent_run:brand-1:store-target:gap-aov:s5:missing-evidence")),
  policy,
  runtime: runtimeReturning(draftOutput(preparedAttempt, [])),
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(),
});
assert.equal(missingEvidenceRun.run.status, "draft_captured");
const missingEvidenceStore = new InMemoryAgentRunAuditStore();
await assert.rejects(
  () =>
    requestMerchantReviewForAgentDraft({
      run: missingEvidenceRun.run,
      context: { ...context, agentRunId: missingEvidenceRun.run.agentRunId },
      auditStore: missingEvidenceStore,
      reviewId: "experiment_review:missing-evidence",
      submittedAt: "2026-05-02T01:00:00.000Z",
      now: deterministicClock(),
    }),
  /accepted deterministic result gate/,
);
assert.equal(missingEvidenceStore.events.find((event) => event.eventType === "draft_validation_evaluated")?.metadata.decision, "block");
assert.equal(missingEvidenceStore.events.some((event) => event.eventType === "merchant_review_requested"), false);

const unknownEvidenceRun = await runAgentAttempt({
  preparedAttempt: preparedAttemptFixture("agent_run:brand-1:store-target:gap-aov:s5:unknown-evidence"),
  prompt,
  tools: createPreparedAttemptReadOnlyTools(preparedAttemptFixture("agent_run:brand-1:store-target:gap-aov:s5:unknown-evidence")),
  policy,
  runtime: runtimeReturning(draftOutput(preparedAttempt, ["evidence:llm-invented-fact"])),
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(),
});
const unknownEvidenceStore = new InMemoryAgentRunAuditStore();
const unknownEvidenceGate = await evaluateAgentDraftResultGate({
  run: unknownEvidenceRun.run,
  context: { ...context, agentRunId: unknownEvidenceRun.run.agentRunId },
  auditStore: unknownEvidenceStore,
  now: deterministicClock(),
});
assert.equal(unknownEvidenceGate.status, "blocked");
assert.deepEqual(unknownEvidenceGate.validationResult.reasonCodes, ["evidence_refs_not_from_context"]);
assert.throws(
  () =>
    submitExperimentPlanForMerchantReview({
      reviewId: "experiment_review:bypass-blocked-validation",
      experimentPlan: unknownEvidenceGate.artifacts?.experimentPlan ?? reviewRequest.gate.artifacts.experimentPlan,
      validationResult: unknownEvidenceGate.validationResult,
      submittedAt: "2026-05-02T01:00:00.000Z",
    }),
  /Only accepted validator results/,
);

const forbiddenMutation = await runAgentAttempt({
  preparedAttempt: preparedAttemptFixture("agent_run:brand-1:store-target:gap-aov:s5:forbidden-mutation"),
  prompt,
  tools: createPreparedAttemptReadOnlyTools(preparedAttemptFixture("agent_run:brand-1:store-target:gap-aov:s5:forbidden-mutation")),
  policy,
  runtime: runtimeReturning({ ...draftOutput(preparedAttempt, context.evidenceRefs), requestedCoreWrites: ["orders"] } as unknown as AgentDraftOutput),
  auditStore: new InMemoryAgentRunAuditStore(),
  callbacks,
  now: deterministicClock(),
});
assert.equal(forbiddenMutation.run.status, "failed");
await assert.rejects(
  () =>
    requestMerchantReviewForAgentDraft({
      run: forbiddenMutation.run,
      context: { ...context, agentRunId: forbiddenMutation.run.agentRunId },
      auditStore: new InMemoryAgentRunAuditStore(),
      reviewId: "experiment_review:forbidden-mutation",
      submittedAt: "2026-05-02T01:00:00.000Z",
    }),
  /captured Agent draft/,
);

function runtimeReturning(draft: AgentDraftOutput): SelectedAgentRuntime {
  return {
    provider: "local-test-provider",
    model: "local-test-model",
    profile: "agent-runtime-s5-test",
    runtimeMode: "pi_sdk_adapter",
    authRef: "auth_ref:local-test-agent-runtime",
    async runTurn({ tools }) {
      const benchmarkRef = await tools.read_worker_freshness({ workerKind: "benchmark" });
      await tools.read_benchmark_opportunity_gaps({ committedJobId: benchmarkRef.committedJobId });
      return {
        transcript: [
          { type: "tool_call", toolName: "read_worker_freshness", summary: "runtime selected a benchmark freshness read" },
          { type: "tool_result", toolName: "read_benchmark_opportunity_gaps", summary: "runtime inspected bounded aggregate gap evidence" },
          { type: "draft_emitted", summary: "runtime emitted one untrusted draft artifact" },
        ],
        draft,
      };
    },
  };
}

function draftOutput(attempt: PreparedAgentAttempt, evidenceRefs: string[]): AgentDraftOutput {
  return {
    outputKind: "intervention_hypothesis_draft",
    truthStatus: "agent_draft_not_core_truth",
    hypothesis: `Explore merchant-reviewed intervention for ${attempt.opportunityGapId}.`,
    reasoningSummary: "Runtime stayed inside the result boundary and only produced a draft.",
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
    sessionId: "agent_session:brand-1:store-target:gap-aov:s5",
    brandId: "brand-1",
    storeId: "store-target",
    opportunityGapId: opportunityGap.opportunityGapId,
    requestedBy: "system:test",
    createdAt: "2026-05-02T00:00:00.000Z",
    identitySource: "deterministic_tenant_scope",
    freshnessRecords: freshnessRecords(),
    contextBudget: { maxSeedBytes: 8192, maxToolResultBytes: 4096 },
    evidenceRefs: opportunityGap.evidenceRefs,
    assumptions: ["Peer benchmark comparison is directional and non-causal."],
    minimumCommittedAt: "2026-05-02T00:00:00.000Z",
  });
  assert.equal(prepared.status, "prepared");
  return prepared;
}

function freshnessRecords(): WorkerFreshnessRecord[] {
  return [
    freshnessRecord("projection", "worker_job:projection:s5", { sessionCount: 40, orderCount: 20, avgOrderValue: 50 }),
    freshnessRecord("snapshot", "worker_job:snapshot:s5", { snapshotDate: "2026-05-02", metricCount: 8, confirmedSegmentCount: 1 }),
    freshnessRecord("benchmark", "worker_job:benchmark:s5", { gapCount: 1, peerSampleStatus: "sufficient", aggregateOnly: true }),
    freshnessRecord("evidence", "worker_job:evidence:s5", { evidenceCount: 2, verdictSummary: "deterministic_records_only" }),
  ];
}

function freshnessRecord(workerKind: WorkerKind, committedJobId: string, outputSummary: Record<string, unknown>): WorkerFreshnessRecord {
  return {
    checkpointId: `checkpoint:${workerKind}:s5`,
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
