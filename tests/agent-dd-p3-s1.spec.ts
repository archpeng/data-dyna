import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { OpportunityGap } from "../src/benchmarks/opportunity-gaps.ts";
import {
  AgentContextBundleSchema,
  BUSINESS_MUTATION_DISALLOWED_TARGETS,
  CORE_WRITE_DISALLOWED_TARGETS,
  buildAgentContextBundle,
} from "../src/agent/context-bundle.ts";

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

const serializedContext = JSON.stringify(context);
assert.doesNotMatch(serializedContext, /order_write|metric_write|benchmark_write|evidence_write|business_config_write/);

const migration = readFileSync("migrations/0005_agent_runs.sql", "utf8");
assert.match(migration, /CREATE TABLE IF NOT EXISTS agent_runs/);
assert.match(migration, /CREATE TABLE IF NOT EXISTS agent_run_events/);
assert.match(migration, /context_bundle_version TEXT NOT NULL CHECK \(context_bundle_version = 'agent-context-bundle\.v1'\)/);
assert.match(migration, /draft->>'truthStatus' = 'agent_draft_not_core_truth'/);
assert.match(migration, /jsonb_array_length\(COALESCE\(draft->'requestedCoreWrites', '\[\]'::jsonb\)\) = 0/);
assert.match(migration, /ON agent_runs \(store_id, opportunity_gap_id, started_at DESC\)/);
