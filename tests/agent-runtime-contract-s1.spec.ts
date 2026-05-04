import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contract = readFileSync("docs/agent/agent-runtime-boundary-contract.md", "utf8");
const agentReadme = readFileSync("src/agent/README.md", "utf8");

for (const required of [
  "# Data Dyna Agent Runtime Boundary Contract",
  "DD-P6-S1",
  "runAgentAttempt({ preparedAttempt, prompt, tools, policy, runtime, audit })",
  "Data Dyna owns the boundary. The LLM/harness owns the turn flow inside that boundary.",
  "Validation and merchant review are result gates. They are not a hidden server-managed business reasoning pipeline.",
  "Missing or ambiguous provider, model, profile, auth, prompt, tool catalog, tool policy, prepared attempt, or audit store fails closed with audit evidence.",
  "There is no provider fallback, model fallback, runtime fallback, fixture fallback, relaxed-policy fallback, or architecture-iteration fallback.",
  "Local/test doubles may exist only in tests around this selected boundary. They must not be reachable production fallback paths.",
]) {
  assert.ok(contract.includes(required), `contract must include ${required}`);
}

for (const preparedAttemptTerm of [
  "preparedAgentAttempt",
  "attemptId",
  "agentRunId",
  "sessionId",
  "brandId",
  "storeId",
  "opportunityGapId",
  "contextBundleVersion",
  "agent-context-bundle.v1",
  "workerFreshnessRefs[]",
  "contextSeed",
  "contextBudget",
  "toolCatalogVersion",
  "forbiddenCapabilities[]",
  "blocked_missing_freshness",
  "blocked_stale_freshness",
  "blocked_dead_letter",
  "blocked_tenant_mismatch",
  "blocked_policy",
]) {
  assert.ok(contract.includes(preparedAttemptTerm), `contract must define prepared attempt term ${preparedAttemptTerm}`);
}

for (const p5Capability of [
  "read_worker_freshness",
  "read_projection_summary",
  "read_snapshot_summary",
  "read_benchmark_opportunity_gaps",
  "read_evidence_records",
  "build_agent_context_seed",
  "read_dead_letter_diagnosis",
]) {
  assert.ok(contract.includes(p5Capability), `contract must map P5 capability ${p5Capability}`);
}

for (const forbidden of [
  "arbitrary_sql",
  "raw_payload_read",
  "secret_read",
  "Worker mutation tools",
  "Core writes",
  "Direct business mutations",
  "Evidence promotion",
  "Merchant decision authority",
  "Runtime fallback authority",
  "evidence_facts",
  "provider fallback",
  "model fallback",
  "runtime fallback",
  "fixture fallback",
  "old alias fallback",
]) {
  assert.ok(contract.includes(forbidden), `contract must explicitly forbid ${forbidden}`);
}

for (const gate of [
  "Tool policy lifecycle",
  "Before tool registration",
  "Before each tool call",
  "Before tool results return to the LLM",
  "Runtime policy gates",
  "Session/run audit contract",
  "Result boundary, validator gate, and merchant-review gate",
  "truthStatus = agent_draft_not_core_truth",
  "requestedCoreWrites = []",
]) {
  assert.ok(contract.includes(gate), `contract must document gate ${gate}`);
}

for (const obsolete of [
  "AgentRuntimeAdapter.draft(...)",
  "adapter.draft(context)",
  "createFixtureAgentRuntimeAdapter",
  "fixture_adapter",
  "read summary -> draft -> validate -> submit",
  "compatibility runtime aliases",
  "static full-context packing",
  "replace/delete in `DD-P6-S3`",
  "replace with prepared attempt seed/index in `DD-P6-S2`",
]) {
  assert.ok(contract.includes(obsolete), `contract must name obsolete surface ${obsolete}`);
}

assert.doesNotMatch(contract, /S1 (implements|adds|creates) (a )?(live )?(LLM|provider|Pi SDK) (call|runtime|integration)/i);
assert.doesNotMatch(contract, /fallback (is|may be|can be|should be) (used|allowed|selected|enabled)/i);
assert.doesNotMatch(contract, /Agent output (is|becomes) (Core truth|evidence fact|merchant approval|business action)/i);
assert.doesNotMatch(contract, /server (owns|manages) (the )?(query|reason|draft|tool-use) (flow|sequence)/i);

assert.ok(agentReadme.includes("docs/agent/agent-runtime-boundary-contract.md"), "agent README must link the S1 contract");
assert.ok(agentReadme.includes("pre-P6 raw material"), "agent README must mark current fixture/draft surfaces as pre-P6 raw material");
assert.ok(agentReadme.includes("runAgentAttempt({ preparedAttempt, prompt, tools, policy, runtime, audit })"));
