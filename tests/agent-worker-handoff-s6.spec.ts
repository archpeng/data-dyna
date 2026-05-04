import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BUSINESS_MUTATION_DISALLOWED_TARGETS,
  CORE_WRITE_DISALLOWED_TARGETS,
  DEFAULT_ALLOWED_DRAFT_OPERATIONS,
} from "../src/agent/context-bundle.ts";
import { DEFAULT_AGENT_TOOL_DESCRIPTORS, evaluateAgentToolPolicy } from "../src/agent/agent-tools.ts";
import {
  benchmarkWorkerContract,
  evidenceWorkerContract,
  projectionWorkerContract,
  snapshotWorkerContract,
} from "../src/app/workers/index.ts";

const handoff = readFileSync("docs/workers/p6-agent-runtime-handoff.md", "utf8");

for (const required of [
  "# Data Dyna P6 Agent Runtime Handoff",
  "AgentContextBundle",
  "agent-context-bundle.v1",
  "read_worker_freshness",
  "read_projection_summary",
  "read_snapshot_summary",
  "read_benchmark_opportunity_gaps",
  "read_evidence_records",
  "build_agent_context_bundle",
  "read_dead_letter_diagnosis",
  "prepared_agent_context_attempt",
  "worker_freshness_refs",
  "context_budget",
  "fail closed",
]) {
  assert.match(handoff, new RegExp(escapeRegExp(required)), `handoff must document ${required}`);
}

for (const worker of [projectionWorkerContract, snapshotWorkerContract, benchmarkWorkerContract, evidenceWorkerContract]) {
  assert.match(handoff, new RegExp(`readFreshness\\("${worker.kind}"`), `handoff must cite ${worker.kind} freshness`);
  assert.ok(
    worker.forbiddenRuntimeClaims.some((claim) => claim.includes("Do not claim exactly-once")),
    `${worker.kind} worker must still avoid exactly-once claims`,
  );
  assert.ok(
    worker.explicitResiduals.some((residual) => residual.includes("No Agent runtime")),
    `${worker.kind} worker must still preserve Agent runtime as residual`,
  );
}

for (const forbidden of [
  "arbitrary_sql",
  "raw_payload_read",
  "secret_read",
  "Direct Core writes",
  "Direct business mutations",
  "live Pi provider calls",
  "Agent session creation",
  "enqueue, claim, heartbeat, checkpoint, complete, retry, dead-letter",
  "Treating LLM output as fact",
]) {
  assert.match(handoff, new RegExp(escapeRegExp(forbidden)), `handoff must forbid ${forbidden}`);
}

for (const residual of [
  "P6 still owns",
  "Live Pi provider integration",
  "Agent run storage",
  "Runtime tool-policy enforcement",
  "provider failure/cost audit",
  "Production dashboarding, paging, mature SLOs, incident management",
  "cloud observability backend selection",
  "capacity planning",
]) {
  assert.match(handoff, new RegExp(escapeRegExp(residual)), `handoff must preserve residual ${residual}`);
}

const policy = evaluateAgentToolPolicy(DEFAULT_AGENT_TOOL_DESCRIPTORS);
assert.equal(policy.allowed, true);
assert.deepEqual(policy.deniedToolNames, []);
for (const operation of DEFAULT_ALLOWED_DRAFT_OPERATIONS) {
  assert.doesNotMatch(operation, /write|update|mutate|execute|apply|send|menu|price|coupon/);
}
for (const target of [...CORE_WRITE_DISALLOWED_TARGETS, ...BUSINESS_MUTATION_DISALLOWED_TARGETS]) {
  assert.match(handoff, new RegExp(escapeRegExp(target)), `handoff must name disallowed target ${target}`);
}

assert.doesNotMatch(handoff, /P5 (implements|completes) (live )?Agent runtime/i);
assert.doesNotMatch(handoff, /P5 (implements|completes) production dashboard/i);
assert.doesNotMatch(handoff, /P5 (implements|completes) paging/i);
assert.doesNotMatch(handoff, /P5 (implements|completes) mature SLO/i);
assert.doesNotMatch(handoff, /P5 (implements|completes) incident-management/i);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
