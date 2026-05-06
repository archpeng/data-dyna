import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { OpportunityGap } from "../src/benchmarks/opportunity-gaps.ts";
import { buildAgentContextBundle } from "../src/agent/context-bundle.ts";
import {
  AgentToolDescriptorSchema,
  DEFAULT_AGENT_TOOL_DESCRIPTORS,
  SAFE_AGENT_TOOL_NAMES,
  assertAgentToolPolicy,
  evaluateAgentToolPolicy,
} from "../src/agent/agent-tools.ts";
import { ExperimentPlanSchema } from "../src/agent/experiment-plan.ts";
import { validateExperimentPlan } from "../src/agent/experiment-validator.ts";
import { draftFixtureExperimentPlanFromContext } from "./support/experiment-plan-fixture.ts";

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
  agentRunId: "agent_run:brand-1:store-target:gap-aov:dd-p3-s2",
  sessionId: "agent_session:brand-1:store-target:gap-aov",
  opportunityGap,
  createdAt: "2026-05-02T00:00:00.000Z",
});

assert.deepEqual(SAFE_AGENT_TOOL_NAMES, [
  "read_worker_freshness",
  "read_projection_summary",
  "read_snapshot_summary",
  "read_benchmark_opportunity_gaps",
  "read_evidence_records",
  "read_dead_letter_diagnosis",
]);
for (const descriptor of DEFAULT_AGENT_TOOL_DESCRIPTORS) {
  assert.deepEqual(AgentToolDescriptorSchema.parse(descriptor), descriptor);
}
assert.doesNotThrow(() => assertAgentToolPolicy(DEFAULT_AGENT_TOOL_DESCRIPTORS));
assert.deepEqual(evaluateAgentToolPolicy(DEFAULT_AGENT_TOOL_DESCRIPTORS).deniedToolNames, []);
assert.throws(
  () => assertAgentToolPolicy([{ name: "apply_coupon", mutationPolicy: "no_core_or_business_mutation" }]),
  /safe high-level allowlist/,
);
assert.throws(
  () => assertAgentToolPolicy([{ name: "read_projection_summary", mutationPolicy: "can_write_business_config" }]),
  /no_core_or_business_mutation/,
);
assert.throws(
  () => assertAgentToolPolicy([{ name: "draft_experiment_plan", mutationPolicy: "no_core_or_business_mutation" }]),
  /safe high-level allowlist/,
);

const draft = draftFixtureExperimentPlanFromContext(context);
assert.equal(draft.hypothesis.truthStatus, "agent_draft_not_core_truth");
assert.equal(draft.experimentPlan.truthStatus, "agent_draft_not_core_truth");
assert.deepEqual(draft.hypothesis.requestedCoreWrites, []);
assert.deepEqual(draft.experimentPlan.requestedCoreWrites, []);
assert.deepEqual(draft.experimentPlan.evidenceRefs, context.evidenceRefs);
assert.ok(draft.experimentPlan.uncertainty.confidence > 0);
assert.equal(draft.experimentPlan.safety.merchantConfirmationRequired, true);
assert.equal(draft.experimentPlan.safety.rollbackSupported, true);
assert.ok(draft.experimentPlan.measurement.guardrails.length >= 1);
assert.deepEqual(ExperimentPlanSchema.parse(JSON.parse(JSON.stringify(draft.experimentPlan))), draft.experimentPlan);

const accepted = validateExperimentPlan({ context, hypothesis: draft.hypothesis, experimentPlan: draft.experimentPlan });
assert.equal(accepted.decision, "accept");
assert.deepEqual(accepted.reasonCodes, []);

const weakSampleContext = buildAgentContextBundle({
  agentRunId: "agent_run:brand-1:store-target:gap-aov:weak-sample",
  sessionId: "agent_session:brand-1:store-target:gap-aov",
  opportunityGap: {
    ...opportunityGap,
    sampleStatus: "weak_sample",
    interpretation: "insufficient_sample_not_ranked",
    confidence: 0.2,
    rank: null,
  },
  createdAt: "2026-05-02T00:00:00.000Z",
});
const weakDraft = draftFixtureExperimentPlanFromContext(weakSampleContext);
const needsMoreData = validateExperimentPlan({ context: weakSampleContext, hypothesis: weakDraft.hypothesis, experimentPlan: weakDraft.experimentPlan });
assert.equal(needsMoreData.decision, "needs_more_data");
assert.ok(needsMoreData.reasonCodes.includes("weak_or_insufficient_sample"));

const missingEvidence = validateExperimentPlan({
  context,
  hypothesis: draft.hypothesis,
  experimentPlan: { ...draft.experimentPlan, evidenceRefs: [] },
});
assert.equal(missingEvidence.decision, "block");
assert.ok(missingEvidence.reasonCodes.includes("schema_invalid"));

const wrongEvidence = validateExperimentPlan({
  context,
  hypothesis: { ...draft.hypothesis, evidenceRefs: ["unrelated:evidence"] },
  experimentPlan: draft.experimentPlan,
});
assert.equal(wrongEvidence.decision, "block");
assert.ok(wrongEvidence.reasonCodes.includes("evidence_refs_not_from_context"));

const zeroConfidence = validateExperimentPlan({
  context,
  hypothesis: { ...draft.hypothesis, uncertainty: { ...draft.hypothesis.uncertainty, confidence: 0 } },
  experimentPlan: { ...draft.experimentPlan, uncertainty: { ...draft.experimentPlan.uncertainty, confidence: 0 } },
});
assert.equal(zeroConfidence.decision, "block");
assert.ok(zeroConfidence.reasonCodes.includes("missing_uncertainty_or_confidence"));

const noMerchantConfirmation = validateExperimentPlan({
  context,
  hypothesis: draft.hypothesis,
  experimentPlan: { ...draft.experimentPlan, safety: { ...draft.experimentPlan.safety, merchantConfirmationRequired: false } },
});
assert.equal(noMerchantConfirmation.decision, "block");
assert.ok(noMerchantConfirmation.reasonCodes.includes("merchant_confirmation_required"));

const noRollback = validateExperimentPlan({
  context,
  hypothesis: draft.hypothesis,
  experimentPlan: { ...draft.experimentPlan, safety: { ...draft.experimentPlan.safety, rollbackSupported: false } },
});
assert.equal(noRollback.decision, "block");
assert.ok(noRollback.reasonCodes.includes("rollback_required"));

const noGuardrails = validateExperimentPlan({
  context,
  hypothesis: draft.hypothesis,
  experimentPlan: { ...draft.experimentPlan, measurement: { ...draft.experimentPlan.measurement, guardrails: [] } },
});
assert.equal(noGuardrails.decision, "block");
assert.ok(noGuardrails.reasonCodes.includes("guardrail_required"));

const skill = readFileSync(".pi/skills/data-dyna-experiment-planner/SKILL.md", "utf8");
assert.match(skill, /Generate hypotheses, not facts/);
assert.match(skill, /Draft experiment plans, not direct business actions/);
assert.match(skill, /Do not directly apply menu, price, coupon, or customer-message changes/);
assert.match(skill, /deterministic validator/);
assert.match(skill, /merchant review/);

const prompt = readFileSync(".pi/prompts/data-dyna-experiment-plan.md", "utf8");
assert.match(prompt, /Generate hypotheses, not facts/);
assert.match(prompt, /Do not directly apply menu, price, coupon, customer-message/);
assert.match(prompt, /Return a draft for deterministic validation and merchant review only/);

const doc = readFileSync("docs/agent-experiment-plan-v1.md", "utf8");
assert.match(doc, /read_worker_freshness/);
assert.match(doc, /read_benchmark_opportunity_gaps/);
assert.doesNotMatch(doc, /submit_for_merchant_review/);
assert.match(doc, /deterministic/);
assert.match(doc, /does not call an LLM/);
