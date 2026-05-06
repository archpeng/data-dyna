import assert from "node:assert/strict";
import type { WorkerFreshnessRecord, WorkerKind } from "../src/app/workers/index.ts";
import {
  DEFAULT_AGENT_READ_ONLY_TOOL_DESCRIPTORS,
  FORBIDDEN_AGENT_CAPABILITIES,
  InMemoryPreparedAgentAttemptRepository,
  PreparedAgentAttemptSchema,
  createPreparedAttemptReadOnlyTools,
  prepareAgentAttempt,
  readPreparedAttemptDeadLetterDiagnosis,
  type PrepareAgentAttemptInput,
} from "../src/agent/prepared-attempt.ts";

const baseInput: PrepareAgentAttemptInput = {
  attemptId: "prepared_attempt:brand-1:store-target:gap-aov:001",
  agentRunId: "agent_run:brand-1:store-target:gap-aov:s2",
  sessionId: "agent_session:brand-1:store-target:gap-aov:s2",
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
};

const prepared = prepareAgentAttempt(baseInput);
assert.equal(prepared.status, "prepared");
assert.equal(prepared.identitySource, "deterministic_tenant_scope");
assert.equal(prepared.contextBundleVersion, "agent-context-bundle.v1");
assert.equal(prepared.toolCatalogVersion, "agent-read-tools.v1");
assert.equal(prepared.workerFreshnessRefs.length, 4);
assert.ok(prepared.contextSeed);
assert.match(prepared.contextSeedHash ?? "", /^sha256:/);
assert.deepEqual(
  prepared.contextSeed?.freshnessIndex.map((entry) => entry.workerKind),
  ["projection", "snapshot", "benchmark", "evidence"],
);
assert.ok(prepared.allowedReadCapabilities.includes("read_projection_summary"));
assert.ok(prepared.allowedReadCapabilities.includes("read_dead_letter_diagnosis"));
for (const forbidden of FORBIDDEN_AGENT_CAPABILITIES) {
  assert.ok(prepared.forbiddenCapabilities.includes(forbidden));
}
assert.deepEqual(PreparedAgentAttemptSchema.parse(JSON.parse(JSON.stringify(prepared))), prepared);

const repository = new InMemoryPreparedAgentAttemptRepository();
await repository.save(prepared);
assert.deepEqual(await repository.get(prepared.attemptId), prepared);

const tools = createPreparedAttemptReadOnlyTools(prepared);
const projectionRef = tools.read_worker_freshness({ workerKind: "projection" });
assert.equal(projectionRef.committedJobId, "worker_job:projection:001");
const projectionSummary = tools.read_projection_summary({ committedJobId: projectionRef.committedJobId });
assert.equal(projectionSummary.freshnessRef.workerKind, "projection");
assert.deepEqual(projectionSummary.summary, { sessionCount: 40, orderCount: 20, avgOrderValue: 50 });
assert.throws(
  () => tools.read_projection_summary({ committedJobId: "worker_job:projection:other" }),
  /not scoped to the prepared projection freshness ref/,
);
assert.equal(tools.read_dead_letter_diagnosis(), undefined);
assert.throws(
  () => createPreparedAttemptReadOnlyTools({ ...prepared, status: "blocked_policy" }),
  /require a prepared or blocked dead-letter attempt/,
);

const missingFreshness = prepareAgentAttempt({
  ...baseInput,
  attemptId: "prepared_attempt:missing",
  freshnessRecords: baseInput.freshnessRecords.filter((record) => record.workerKind !== "evidence"),
});
assert.equal(missingFreshness.status, "blocked_missing_freshness");
assert.equal(missingFreshness.failureReason?.code, "missing_freshness");
assert.equal(missingFreshness.contextSeed, undefined);

const staleFreshness = prepareAgentAttempt({
  ...baseInput,
  attemptId: "prepared_attempt:stale",
  minimumCommittedAt: "2026-05-03T00:00:00.000Z",
});
assert.equal(staleFreshness.status, "blocked_stale_freshness");
assert.equal(staleFreshness.failureReason?.code, "stale_freshness");

const deadLettered = prepareAgentAttempt({
  ...baseInput,
  attemptId: "prepared_attempt:dead-lettered",
  deadLetterDiagnoses: [
    {
      workerKind: "benchmark",
      jobId: "worker_job:benchmark:001",
      failureClass: "contract_violation",
      reasonCode: "unsafe_output",
      nextOperatorAction: "repair deterministic benchmark worker output",
    },
  ],
});
assert.equal(deadLettered.status, "blocked_dead_letter");
assert.equal(readPreparedAttemptDeadLetterDiagnosis(deadLettered)?.code, "dead_lettered_worker");
assert.match(readPreparedAttemptDeadLetterDiagnosis(deadLettered)?.message ?? "", /repair deterministic benchmark worker output/);
const deadLetterTools = createPreparedAttemptReadOnlyTools(deadLettered);
assert.equal(deadLetterTools.read_dead_letter_diagnosis()?.code, "dead_lettered_worker");
assert.throws(
  () => deadLetterTools.read_benchmark_opportunity_gaps({ committedJobId: "worker_job:benchmark:001" }),
  /summary tools require a prepared attempt/,
);

const tenantMismatch = prepareAgentAttempt({
  ...baseInput,
  attemptId: "prepared_attempt:tenant-mismatch",
  freshnessRecords: baseInput.freshnessRecords.map((record) =>
    record.workerKind === "snapshot" ? { ...record, tenantScope: { ...record.tenantScope, storeId: "other-store" } } : record,
  ),
});
assert.equal(tenantMismatch.status, "blocked_tenant_mismatch");
assert.equal(tenantMismatch.failureReason?.code, "tenant_or_source_mismatch");

const sourceMismatch = prepareAgentAttempt({
  ...baseInput,
  attemptId: "prepared_attempt:source-mismatch",
  freshnessRecords: baseInput.freshnessRecords.map((record) =>
    record.workerKind === "evidence" ? { ...record, sourceScope: { ...record.sourceScope, source: "crm" } } : record,
  ),
});
assert.equal(sourceMismatch.status, "blocked_tenant_mismatch");
assert.equal(sourceMismatch.failureReason?.code, "tenant_or_source_mismatch");
assert.match(sourceMismatch.failureReason?.message ?? "", /tenant\/source scope/);

const forbiddenRawData = prepareAgentAttempt({
  ...baseInput,
  attemptId: "prepared_attempt:raw-data",
  freshnessRecords: baseInput.freshnessRecords.map((record) =>
    record.workerKind === "projection" ? { ...record, outputSummary: { rawPayload: { bearerToken: "secret" } } } : record,
  ),
});
assert.equal(forbiddenRawData.status, "blocked_policy");
assert.equal(forbiddenRawData.failureReason?.code, "forbidden_raw_data");
assert.equal(forbiddenRawData.workerFreshnessRefs.some((ref) => ref.workerKind === "projection"), false);

const overBudget = prepareAgentAttempt({
  ...baseInput,
  attemptId: "prepared_attempt:over-budget",
  contextBudget: { maxSeedBytes: 10, maxToolResultBytes: 2048 },
});
assert.equal(overBudget.status, "blocked_policy");
assert.equal(overBudget.failureReason?.code, "context_budget_exceeded");
const overToolBudget = prepareAgentAttempt({
  ...baseInput,
  attemptId: "prepared_attempt:over-tool-budget",
  contextBudget: { maxSeedBytes: 8192, maxToolResultBytes: 10 },
});
assert.equal(overToolBudget.status, "prepared");
assert.throws(
  () => createPreparedAttemptReadOnlyTools(overToolBudget).read_projection_summary({ committedJobId: "worker_job:projection:001" }),
  /tool-result budget/,
);

const freeFormIdentity = prepareAgentAttempt({
  ...baseInput,
  attemptId: "prepared_attempt:free-form",
  identitySource: "free_form_agent_input",
});
assert.equal(freeFormIdentity.status, "blocked_policy");
assert.equal(freeFormIdentity.failureReason?.code, "free_form_identity_scope");

const unsafeToolCatalog = prepareAgentAttempt({
  ...baseInput,
  attemptId: "prepared_attempt:unsafe-tool",
  toolCatalog: [
    ...DEFAULT_AGENT_READ_ONLY_TOOL_DESCRIPTORS,
    {
      name: "read_projection_summary",
      capability: "read_context",
      mutationPolicy: "can_write_business_config",
      requiresFreshnessRef: true,
      inputBoundary: "unsafe",
      outputBoundary: "unsafe",
    } as unknown as (typeof DEFAULT_AGENT_READ_ONLY_TOOL_DESCRIPTORS)[number],
  ],
});
assert.equal(unsafeToolCatalog.status, "blocked_policy");
assert.equal(unsafeToolCatalog.failureReason?.code, "unsafe_tool_catalog");

for (const descriptor of DEFAULT_AGENT_READ_ONLY_TOOL_DESCRIPTORS) {
  assert.equal(descriptor.mutationPolicy, "no_core_or_business_mutation");
  assert.equal(descriptor.capability, "read_context");
  assert.doesNotMatch(descriptor.name, /sql|payload|secret|write|mutate|enqueue|checkpoint|apply|execute/);
}

const serializedPreparedAttempt = JSON.stringify(prepared);
assert.doesNotMatch(serializedPreparedAttempt, /rawPayload|bearerToken|customerId|memberId|deviceId/);

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
