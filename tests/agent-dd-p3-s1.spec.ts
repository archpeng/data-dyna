import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { OpportunityGap } from "../src/benchmarks/opportunity-gaps.ts";
import {
  AgentContextBundleSchema,
  BUSINESS_MUTATION_DISALLOWED_TARGETS,
  CORE_WRITE_DISALLOWED_TARGETS,
  buildAgentContextBundle,
} from "../src/agent/context-bundle.ts";
import {
  InMemoryAgentRunAuditStore,
  createFixtureAgentRuntimeAdapter,
  runDataDynaAgentSidecar,
  type AgentDraftOutput,
  type AgentRuntimeAdapter,
} from "../src/agent/agent-sidecar.ts";

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
  rank: 2,
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
  agentRunId: "agent_run:brand-1:store-target:gap-aov:001",
  sessionId: "agent_session:brand-1:store-target:gap-aov",
  opportunityGap,
  createdAt: "2026-05-02T00:00:00.000Z",
});

assert.equal(context.contractVersion, "agent-context-bundle.v1");
assert.equal(context.brandId, opportunityGap.brandId);
assert.equal(context.storeId, opportunityGap.storeId);
assert.equal(context.opportunityGapId, opportunityGap.opportunityGapId);
assert.equal(context.facts.opportunityGap.metricId, "avg_order_value");
assert.deepEqual(AgentContextBundleSchema.parse(JSON.parse(JSON.stringify(context))), context);
assert.throws(
  () => AgentContextBundleSchema.parse({ ...context, storeId: "other-store" }),
  /storeId must match facts\.opportunityGap\.storeId/,
);
assert.throws(
  () => AgentContextBundleSchema.parse({ ...context, disallowedMutationTargets: ["orders"] }),
  /missing required disallowed mutation target: metrics/,
);
assert.throws(
  () => AgentContextBundleSchema.parse({ ...context, evidenceRefs: ["unrelated:evidence"] }),
  /bundle evidenceRefs must match opportunity gap evidenceRefs/,
);

for (const target of [...CORE_WRITE_DISALLOWED_TARGETS, ...BUSINESS_MUTATION_DISALLOWED_TARGETS]) {
  assert.ok(context.disallowedMutationTargets.includes(target));
}
for (const operation of context.allowedDraftOperations) {
  assert.doesNotMatch(operation, /write|update|mutate|execute|apply|send|menu|price|coupon/);
}

const auditStore = new InMemoryAgentRunAuditStore();
const result = await runDataDynaAgentSidecar({
  context,
  adapter: createFixtureAgentRuntimeAdapter(),
  auditStore,
  promptRef: "prompt:data-dyna-agent:v1:fixture",
  now: deterministicClock(),
});

assert.equal(result.run.status, "draft_captured");
assert.equal(result.run.runtimeMode, "fixture_adapter");
assert.equal(result.run.provider, "fixture");
assert.equal(result.run.model, "fixture-pi-sdk-boundary");
assert.equal(result.run.agentRunId, context.agentRunId);
assert.equal(result.run.sessionId, context.sessionId);
assert.equal(result.run.storeId, context.storeId);
assert.equal(result.run.opportunityGapId, context.opportunityGapId);
assert.equal(result.run.draft?.truthStatus, "agent_draft_not_core_truth");
assert.deepEqual(result.run.draft?.requestedCoreWrites, []);
assert.equal(result.run.draft?.draftExperimentPlan.merchantReviewRequired, true);
assert.deepEqual(result.run.draft?.evidenceRefs, context.evidenceRefs);
assert.equal(auditStore.runs.get(context.agentRunId)?.status, "draft_captured");
assert.deepEqual(result.events.map((event) => event.eventType), ["run_started", "context_loaded", "adapter_invoked", "draft_captured"]);
assert.equal(auditStore.events.length, 4);
for (const event of result.events) {
  assert.equal(event.agentRunId, context.agentRunId);
  assert.equal(event.sessionId, context.sessionId);
  assert.equal(event.storeId, context.storeId);
  assert.equal(event.opportunityGapId, context.opportunityGapId);
}

const serializedRun = JSON.stringify(result.run);
assert.match(serializedRun, /agent_draft_not_core_truth/);
assert.doesNotMatch(serializedRun, /order_write|metric_write|benchmark_write|evidence_write|business_config_write/);

const invalidWriteAdapter: AgentRuntimeAdapter = {
  provider: "fixture",
  model: "invalid-core-write-fixture",
  runtimeMode: "fixture_adapter",
  async draft() {
    return {
      outputKind: "intervention_hypothesis_draft",
      truthStatus: "agent_draft_not_core_truth",
      hypothesis: "invalid",
      reasoningSummary: "invalid",
      draftExperimentPlan: {
        objective: "invalid",
        measurementMetricId: "avg_order_value",
        guardrailMetricIds: [],
        merchantReviewRequired: true,
      },
      evidenceRefs: context.evidenceRefs,
      allowedDraftOperationsUsed: [],
      requestedCoreWrites: ["metrics"],
      disallowedMutationTargetsAcknowledged: context.disallowedMutationTargets,
    } as unknown as AgentDraftOutput;
  },
};
const invalidWriteResult = await runDataDynaAgentSidecar({
  context: { ...context, agentRunId: "agent_run:brand-1:store-target:gap-aov:invalid-write" },
  adapter: invalidWriteAdapter,
  auditStore: new InMemoryAgentRunAuditStore(),
  promptRef: "prompt:data-dyna-agent:v1:fixture",
  now: deterministicClock(),
});
assert.equal(invalidWriteResult.run.status, "failed");
assert.match(invalidWriteResult.run.errorMessage ?? "", /Never|never|Expected/);
assert.equal(invalidWriteResult.events.at(-1)?.eventType, "run_failed");

const migration = readFileSync("migrations/0005_agent_runs.sql", "utf8");
assert.match(migration, /CREATE TABLE IF NOT EXISTS agent_runs/);
assert.match(migration, /CREATE TABLE IF NOT EXISTS agent_run_events/);
assert.match(migration, /context_bundle_version TEXT NOT NULL CHECK \(context_bundle_version = 'agent-context-bundle\.v1'\)/);
assert.match(migration, /draft->>'truthStatus' = 'agent_draft_not_core_truth'/);
assert.match(migration, /jsonb_array_length\(COALESCE\(draft->'requestedCoreWrites', '\[\]'::jsonb\)\) = 0/);
assert.match(migration, /ON agent_runs \(store_id, opportunity_gap_id, started_at DESC\)/);

function deterministicClock(): () => string {
  let tick = 0;
  return () => `2026-05-02T00:00:0${tick++}.000Z`;
}
