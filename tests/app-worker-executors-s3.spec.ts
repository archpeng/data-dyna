import assert from "node:assert/strict";
import type { DataDynaEvent } from "../src/contracts/event-contract.ts";
import { InMemoryRawEventStore } from "../src/ingestion/raw-event-store.ts";
import type { BusinessProjections, ProjectionStore } from "../src/projections/business-projections.ts";
import type { OpportunityGap } from "../src/benchmarks/opportunity-gaps.ts";
import { buildAgentContextBundle } from "../src/agent/context-bundle.ts";
import { draftFixtureExperimentPlanFromContext } from "../src/agent/experiment-plan.ts";
import { validateExperimentPlan } from "../src/agent/experiment-validator.ts";
import {
  acceptExperimentReview,
  recordActionLifecycleTransition,
  submitExperimentPlanForMerchantReview,
} from "../src/merchant-review/experiment-review.ts";
import type { GuardrailRelation, MetricSnapshot, RestaurantSegmentCandidate, SnapshotMetricId } from "../src/snapshots/independent-cafe-snapshots.ts";
import {
  InMemoryBenchmarkWorkerOutputStore,
  InMemoryEvidenceWorkerOutputStore,
  InMemorySnapshotWorkerOutputStore,
  readWorkerResumeWatermark,
  runBenchmarkWorker,
  runEvidenceWorker,
  runProjectionWorker,
  runSnapshotWorker,
  type ClaimedWorkerJob,
  type WorkerFreshnessRecord,
  type WorkerJobRecord,
  type WorkerJobRepository,
  type WorkerKind,
  type WorkerOutputSummary,
  type WorkerSourceScope,
  type WorkerTenantScope,
  type WorkerWatermark,
} from "../src/app/workers/index.ts";

const now = new Date("2026-05-03T00:00:00.000Z");
const tenantScope: WorkerTenantScope = { brandId: "brand-1", merchantId: "merchant-1", storeId: "store-1" };
const sourceScope: WorkerSourceScope = { source: "pos", producerService: "fixture", producerEnvironment: "test" };
const inputWatermark = { lower: null, upper: { receivedAt: "2026-05-02T10:00:00.000Z", eventId: "evt-order-paid" } };

async function main(): Promise<void> {
const rawEvents = await acceptedRawEvents();
const projectionRepository = new RecordingWorkerJobRepository([
  claimedJob("projection", "job-projection-1", inputWatermark),
  claimedJob("projection", "job-projection-2", inputWatermark),
]);
const projectionStore = new RecordingProjectionStore({ events: projectionRepository.events });

const firstProjectionRun = await runProjectionWorker({
  jobRepository: projectionRepository,
  workerId: "worker-s3",
  now,
  rawEvents,
  outputStore: projectionStore,
  rebuiltAt: "2026-05-03T00:00:00.000Z",
});
assert.equal(firstProjectionRun.status, "completed");
assert.equal(firstProjectionRun.output.orders.length, 1);
assert.equal(firstProjectionRun.outputSummary.orders, 1);
assert.deepEqual(projectionRepository.events, ["claim:projection", "write", "checkpoint:job-projection-1", "complete:job-projection-1"]);
assert.equal(projectionRepository.freshness?.committedWatermark.lastEventId, "evt-order-paid");

const secondProjectionRun = await runProjectionWorker({
  jobRepository: projectionRepository,
  workerId: "worker-s3",
  now,
  rawEvents,
  outputStore: projectionStore,
  rebuiltAt: "2026-05-03T00:00:00.000Z",
});
assert.equal(secondProjectionRun.status, "completed");
assert.deepEqual(secondProjectionRun.output, firstProjectionRun.output);
assert.equal(projectionStore.writeCount, 2, "rerun replaces the same deterministic projection output instead of appending");

const resumedWatermark = await readWorkerResumeWatermark({
  jobRepository: projectionRepository,
  workerKind: "projection",
  tenantScope,
  sourceScope,
  fallbackWatermark: { lower: null },
});
assert.equal(resumedWatermark.lastEventId, "evt-order-paid");

const failingRepository = new RecordingWorkerJobRepository([claimedJob("projection", "job-projection-failing", inputWatermark)]);
const failingStore = new RecordingProjectionStore({ events: failingRepository.events, failWrites: true });
await assert.rejects(
  () =>
    runProjectionWorker({
      jobRepository: failingRepository,
      workerId: "worker-s3",
      now,
      rawEvents,
      outputStore: failingStore,
      rebuiltAt: "2026-05-03T00:00:00.000Z",
    }),
  /synthetic output write failure/,
);
assert.deepEqual(failingRepository.events, ["claim:projection", "write"], "checkpoint must not advance after failed output write");
assert.equal(failingRepository.freshness, undefined);

const projections = firstProjectionRun.output;
const snapshotRepository = new RecordingWorkerJobRepository([claimedJob("snapshot", "job-snapshot-1", firstProjectionRun.outputWatermark)]);
const snapshotStore = new InMemorySnapshotWorkerOutputStore();
const snapshotRun = await runSnapshotWorker({
  jobRepository: snapshotRepository,
  workerId: "worker-s3",
  now,
  projections,
  brandId: "brand-1",
  storeId: "store-1",
  snapshotDate: "2026-05-02",
  outputStore: snapshotStore,
});
assert.equal(snapshotRun.status, "completed");
assert.equal(snapshotRun.output.metricSnapshots.length, 4);
assert.equal(snapshotRun.output.restaurantSegments[0]?.confirmationStatus, "unconfirmed");
assert.deepEqual(snapshotRepository.events, ["claim:snapshot", "checkpoint:job-snapshot-1", "complete:job-snapshot-1"]);
assert.equal((await snapshotStore.current())?.metricSnapshots.length, 4);

const targetMetricSnapshots = snapshotRun.output.metricSnapshots;
const targetRestaurantSegments = snapshotRun.output.restaurantSegments;
const peerMetricSnapshots = [
  metric("peer-brand", "peer-store-1", "avg_order_value", "growth_metric", 55),
  metric("peer-brand", "peer-store-2", "avg_order_value", "growth_metric", 60),
  metric("peer-brand", "peer-store-3", "avg_order_value", "growth_metric", 70),
  metric("peer-brand", "peer-store-1", "checkout_started_cart_rate", "funnel_metric", 0.5),
  metric("peer-brand", "peer-store-2", "checkout_started_cart_rate", "funnel_metric", 0.6),
  metric("peer-brand", "peer-store-3", "checkout_started_cart_rate", "funnel_metric", 0.7),
  metric("peer-brand", "peer-store-1", "refund_rate", "negative_guardrail", 0.01),
  metric("peer-brand", "peer-store-2", "refund_rate", "negative_guardrail", 0.02),
  metric("peer-brand", "peer-store-3", "refund_rate", "negative_guardrail", 0.03),
  metric("peer-brand", "peer-store-1", "repurchase_90d_rate", "growth_metric", 0.2),
  metric("peer-brand", "peer-store-2", "repurchase_90d_rate", "growth_metric", 0.3),
  metric("peer-brand", "peer-store-3", "repurchase_90d_rate", "growth_metric", 0.4),
];
const peerRestaurantSegments = [
  segment("peer-brand", "peer-store-1", "peer-segment-1"),
  segment("peer-brand", "peer-store-2", "peer-segment-2"),
  segment("peer-brand", "peer-store-3", "peer-segment-3"),
];
const benchmarkRepository = new RecordingWorkerJobRepository([claimedJob("benchmark", "job-benchmark-1", snapshotRun.outputWatermark)]);
const benchmarkStore = new InMemoryBenchmarkWorkerOutputStore();
const benchmarkRun = await runBenchmarkWorker({
  jobRepository: benchmarkRepository,
  workerId: "worker-s3",
  now,
  targetMetricSnapshots,
  targetRestaurantSegments,
  peerMetricSnapshots,
  peerRestaurantSegments,
  snapshotDate: "2026-05-02",
  outputStore: benchmarkStore,
});
assert.equal(benchmarkRun.status, "completed");
assert.ok(benchmarkRun.output.opportunityGaps.length > 0);
assert.doesNotMatch(JSON.stringify(benchmarkRun.output), /peer-store-1|peer-store-2|peer-store-3/);
assert.deepEqual(benchmarkRepository.events, ["claim:benchmark", "checkpoint:job-benchmark-1", "complete:job-benchmark-1"]);

const opportunityGap = benchmarkRun.output.opportunityGaps.find((gap) => gap.metricId === "avg_order_value") ?? benchmarkRun.output.opportunityGaps[0];
assert.ok(opportunityGap);
const evidenceFixture = buildEvidenceFixture(opportunityGap);
const evidenceRepository = new RecordingWorkerJobRepository([claimedJob("evidence", "job-evidence-1", benchmarkRun.outputWatermark)]);
const evidenceStore = new InMemoryEvidenceWorkerOutputStore();
const evidenceRun = await runEvidenceWorker({
  jobRepository: evidenceRepository,
  workerId: "worker-s3",
  now,
  experimentPlan: evidenceFixture.experimentPlan,
  acceptance: evidenceFixture.acceptance,
  appliedLifecycleRecord: evidenceFixture.applied,
  opportunityGap,
  beforeMetricSnapshot: evidenceFixture.beforeAov,
  afterMetricSnapshot: evidenceFixture.afterAov,
  guardrails: evidenceFixture.experimentPlan.measurement.guardrails,
  beforeGuardrailMetricSnapshots: { refund_rate: evidenceFixture.beforeRefundRate },
  afterGuardrailMetricSnapshots: { refund_rate: evidenceFixture.afterRefundRate },
  outputStore: evidenceStore,
});
assert.equal(evidenceRun.status, "completed");
assert.equal(evidenceRun.output.evidenceRecord.llmGeneratedClaims.length, 0);
assert.notEqual(evidenceRun.output.evidenceRecord.verdict, "needs_more_data");
assert.deepEqual(evidenceRepository.events, ["claim:evidence", "checkpoint:job-evidence-1", "complete:job-evidence-1"]);
assert.equal((await evidenceStore.current())?.evidenceRecord.evidenceRecordId, evidenceRun.output.evidenceRecord.evidenceRecordId);
}

async function acceptedRawEvents() {
  const store = new InMemoryRawEventStore();
  await store.persistAccepted(event({
    source: "mini_program",
    domain: "user_behavior",
    name: "mini_program.cart_updated",
    occurredAt: "2026-05-02T09:55:00.000Z",
    identity: { actorType: "customer" },
    correlation: { eventId: "evt-cart", sessionId: "session-1" },
    entity: { type: "cart", id: "cart-1" },
    properties: { items: [{ itemId: "item-latte", itemName: "Latte", quantity: 1, amount: 20, menuId: "menu-breakfast" }] },
  }));
  await store.persistAccepted(event({
    source: "mini_program",
    domain: "user_behavior",
    name: "mini_program.checkout_started",
    occurredAt: "2026-05-02T09:58:00.000Z",
    identity: { actorType: "customer" },
    correlation: { eventId: "evt-checkout", sessionId: "session-1" },
    entity: { type: "cart", id: "cart-1" },
    properties: { cartId: "cart-1", orderId: "order-1", amount: 20 },
  }));
  await store.persistAccepted(event({
    name: "pos.order_paid",
    correlation: { eventId: "evt-order-paid", sessionId: "session-pos" },
    properties: {
      totalAmount: 20,
      currency: "CNY",
      paymentId: "payment-1",
      paymentMethod: "cash",
      items: [{ itemId: "item-latte", itemName: "Latte", quantity: 1, amount: 20, menuId: "menu-breakfast" }],
    },
  }));
  return store.accepted().map((record, index) => ({ ...record, receivedAt: `2026-05-02T10:00:0${index}.000Z` }));
}

function event(overrides: Partial<DataDynaEvent>): DataDynaEvent {
  const correlation = { eventId: "evt-default", sessionId: "session-1", ...overrides.correlation };
  return {
    version: "event-contract.v1",
    source: overrides.source ?? "pos",
    domain: overrides.domain ?? "transaction_scene",
    name: overrides.name ?? "pos.order_paid",
    occurredAt: overrides.occurredAt ?? "2026-05-02T10:00:00.000Z",
    producer: { service: "fixture", environment: "test", emittedAt: "2026-05-02T10:00:00.100Z", ...overrides.producer },
    identity: { brandId: "brand-1", merchantId: "merchant-1", storeId: "store-1", memberId: "member-1", actorType: "cashier", ...overrides.identity },
    correlation,
    entity: overrides.entity ?? { type: "order", id: "order-1" },
    properties: overrides.properties ?? {},
    idempotency: { key: `fixture:${correlation.eventId}`, scope: "store", ...overrides.idempotency },
  };
}

class RecordingProjectionStore implements ProjectionStore {
  latest?: BusinessProjections;
  writeCount = 0;
  constructor(private readonly options: { events?: string[]; failWrites?: boolean } = {}) {}

  async replaceAll(output: BusinessProjections): Promise<void> {
    this.writeCount += 1;
    this.options.events?.push("write");
    if (this.options.failWrites) throw new Error("synthetic output write failure");
    this.latest = output;
  }

  async current(): Promise<BusinessProjections | undefined> {
    return this.latest;
  }
}

class RecordingWorkerJobRepository implements WorkerJobRepository {
  readonly events: string[] = [];
  freshness?: WorkerFreshnessRecord;
  private readonly claimedJobs: ClaimedWorkerJob[];

  constructor(claimedJobs: ClaimedWorkerJob[]) {
    this.claimedJobs = [...claimedJobs];
  }

  async enqueue(): Promise<never> {
    throw new Error("enqueue is not used by this executor test");
  }

  async claim(input: { workerKind: WorkerKind }): Promise<ClaimedWorkerJob | undefined> {
    this.events.push(`claim:${input.workerKind}`);
    return this.claimedJobs.shift();
  }

  async heartbeat(): Promise<ClaimedWorkerJob | undefined> {
    throw new Error("heartbeat is not used by this executor test");
  }

  async checkpoint(jobId: string, attemptId: number, outputWatermark: WorkerWatermark, outputSummary: WorkerOutputSummary, committedAt: Date): Promise<WorkerFreshnessRecord> {
    this.events.push(`checkpoint:${jobId}`);
    const claimed = this.lastClaimed(jobId);
    this.freshness = {
      checkpointId: `checkpoint:${jobId}`,
      workerKind: claimed.job.workerKind,
      tenantScope: claimed.job.tenantScope,
      sourceScope: claimed.job.sourceScope,
      committedWatermark: outputWatermark,
      committedJobId: jobId,
      committedAttemptId: attemptId,
      outputSummary,
      committedAt: committedAt.toISOString(),
      updatedAt: committedAt.toISOString(),
    };
    return this.freshness;
  }

  async complete(jobId: string): Promise<WorkerJobRecord> {
    this.events.push(`complete:${jobId}`);
    return { ...this.lastClaimed(jobId).job, status: "succeeded", completedAt: now.toISOString() };
  }

  async retry(): Promise<never> {
    throw new Error("retry is not used by this executor test");
  }

  async deadLetter(): Promise<never> {
    throw new Error("deadLetter is not used by this executor test");
  }

  async readFreshness(): Promise<WorkerFreshnessRecord | undefined> {
    return this.freshness;
  }

  private lastClaimed(jobId: string): ClaimedWorkerJob {
    const current = allClaimedJobs.get(jobId);
    if (!current) throw new Error(`Missing claimed job fixture ${jobId}`);
    return current;
  }
}

const allClaimedJobs = new Map<string, ClaimedWorkerJob>();

function claimedJob(workerKind: WorkerKind, jobId: string, watermark: WorkerWatermark): ClaimedWorkerJob {
  const job: WorkerJobRecord = {
    jobId,
    workerKind,
    status: "running",
    tenantScope,
    sourceScope,
    inputWatermark: watermark,
    idempotencyIdentity: `${workerKind}:${jobId}`,
    correlationId: `correlation:${jobId}`,
    attemptCount: 1,
    maxAttempts: 3,
    lockedBy: "worker-s3",
    lockedUntil: now.toISOString(),
    heartbeatAt: now.toISOString(),
    nextRunAt: now.toISOString(),
    startedAt: now.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  const claimed: ClaimedWorkerJob = {
    job,
    attempt: {
      attemptId: Number(allClaimedJobs.size + 1),
      jobId,
      attemptNumber: 1,
      workerKind,
      claimedBy: "worker-s3",
      status: "started",
      inputWatermark: watermark,
      safeDiagnostic: {},
      startedAt: now.toISOString(),
      heartbeatAt: now.toISOString(),
    },
  };
  allClaimedJobs.set(jobId, claimed);
  return claimed;
}

function metric(
  brandId: string,
  storeId: string,
  metricId: SnapshotMetricId,
  guardrailRelation: GuardrailRelation,
  value: number,
): MetricSnapshot {
  return {
    metricSnapshotId: `metric:${brandId}:${storeId}:2026-05-02:${metricId}`,
    brandId,
    storeId,
    snapshotDate: "2026-05-02",
    definition: {
      metricId,
      label: metricId,
      numerator: `${metricId} numerator`,
      denominator: `${metricId} denominator`,
      window: metricId === "repurchase_90d_rate" ? "90d" : "snapshot",
      owner: "data-dyna-core",
      source: ["metric_snapshots"],
      projectionInputRefs: ["BusinessProjections.fixture"],
      guardrailRelation,
    },
    numeratorValue: value,
    denominatorValue: 1,
    value,
    evidenceRefs: [`metric_evidence:${brandId}:${storeId}:${metricId}`],
  };
}

function segment(brandId: string, storeId: string, segmentCandidateId: string): RestaurantSegmentCandidate {
  return {
    segmentCandidateId,
    brandId,
    storeId,
    snapshotDate: "2026-05-02",
    label: "independent_cafe_core",
    confidence: 0.9,
    evidenceRefs: [`segment_evidence:${segmentCandidateId}`],
    confirmationStatus: "confirmed",
    classificationMethod: "deterministic_projection_rule",
  };
}

function buildEvidenceFixture(opportunityGap: OpportunityGap) {
  const context = buildAgentContextBundle({
    agentRunId: "agent_run:brand-1:store-1:gap-aov:dd-p5-s3",
    sessionId: "agent_session:brand-1:store-1:gap-aov",
    opportunityGap: { ...opportunityGap, brandId: "brand-1", storeId: "store-1" },
    createdAt: "2026-05-02T00:00:00.000Z",
  });
  const draft = draftFixtureExperimentPlanFromContext(context);
  const validation = validateExperimentPlan({ context, hypothesis: draft.hypothesis, experimentPlan: draft.experimentPlan });
  assert.equal(validation.decision, "accept");
  const submission = submitExperimentPlanForMerchantReview({
    reviewId: "experiment_review:brand-1:store-1:plan-aov:dd-p5-s3",
    experimentPlan: draft.experimentPlan,
    validationResult: validation,
    submittedAt: "2026-05-02T01:00:00.000Z",
  });
  const merchantActor = { actorType: "merchant" as const, actorId: "merchant-1", displayName: "Cafe owner" };
  const acceptance = acceptExperimentReview({
    submission,
    decisionId: "experiment_review_decision:accept:dd-p5-s3",
    decidedAt: "2026-05-02T01:10:00.000Z",
    actor: merchantActor,
  });
  const applied = recordActionLifecycleTransition({
    lifecycleRecordId: "experiment_lifecycle:apply:dd-p5-s3",
    reviewId: submission.reviewId,
    experimentPlanId: submission.experimentPlanId,
    brandId: submission.brandId,
    storeId: submission.storeId,
    eventName: "mobile_hq.experiment_applied_recorded",
    occurredAt: "2026-05-02T02:00:00.000Z",
    actor: merchantActor,
    fromState: "accepted",
    toState: "applied",
    acceptanceDecisionId: acceptance.decisionId,
    rollbackRef: "rollback_contract:weekday-morning-aov:dd-p5-s3",
    evidenceRefs: submission.evidenceRefs,
  });
  return {
    experimentPlan: draft.experimentPlan,
    acceptance,
    applied,
    beforeAov: metric("brand-1", "store-1", "avg_order_value", "growth_metric", 50),
    afterAov: metric("brand-1", "store-1", "avg_order_value", "growth_metric", 62),
    beforeRefundRate: metric("brand-1", "store-1", "refund_rate", "negative_guardrail", 0.01),
    afterRefundRate: metric("brand-1", "store-1", "refund_rate", "negative_guardrail", 0.03),
  };
}

await main();
