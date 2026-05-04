import {
  boundedLocalExecutorReliabilityScope,
  defineWorkerContract,
  workerFoundationResiduals,
} from "./worker-contract.ts";
import type { RawEventRecord } from "../../ingestion/raw-event-store.ts";
import type { DatameshMemberLabelsRow } from "../../datamesh/rfm-member-labels.ts";
import {
  rebuildBusinessProjections,
  type BusinessProjections,
  type ProjectionStore,
} from "../../projections/business-projections.ts";
import { runClaimedWorkerJob, type BoundedWorkerRunResult } from "./bounded-worker-runner.ts";
import type { WorkerJobRepository, WorkerOutputSummary, WorkerWatermark } from "./durable-worker-job-repository.ts";
import type { WorkerFailurePolicyInput } from "./worker-failure-policy.ts";
import type { WorkerObservabilityInput } from "./worker-observability.ts";

export const projectionWorkerContract = defineWorkerContract({
  kind: "projection",
  modulePath: "src/app/workers/projection-worker.ts",
  owner: "src/app",
  invocationMode: "script_runner",
  implementationState: "bounded_local_executor",
  purpose: "Boundary for a bounded script/runner that rebuilds business projections from accepted raw events and Datamesh RFM inputs.",
  inputBoundary: "An app adapter supplies bounded RawEventRecord[] and Datamesh rows; this file does not create repositories or read production resources.",
  outputBoundary: "The executor writes BusinessProjections through an injected output store before checkpointing the durable worker job.",
  coreBoundary: "Calls deterministic projection functions while keeping DB clients and runtime config outside Core modules.",
  reliability: boundedLocalExecutorReliabilityScope,
  explicitResiduals: workerFoundationResiduals,
  forbiddenRuntimeClaims: [
    "Do not claim exactly-once semantics from the durable job table alone.",
    "Do not import PostgreSQL clients into deterministic Core modules.",
    "Do not run Agent runtime or merchant-review side effects.",
  ],
});

export type ProjectionWorkerExecutionInput = {
  jobRepository: WorkerJobRepository;
  workerId: string;
  now: Date;
  leaseSeconds?: number;
  rawEvents: RawEventRecord[];
  rfmRows?: DatameshMemberLabelsRow[];
  rebuiltAt?: string;
  outputStore: ProjectionStore;
  failurePolicy?: WorkerFailurePolicyInput;
  observability?: WorkerObservabilityInput;
};

export async function runProjectionWorker(
  input: ProjectionWorkerExecutionInput,
): Promise<BoundedWorkerRunResult<BusinessProjections>> {
  return runClaimedWorkerJob({
    workerKind: "projection",
    jobRepository: input.jobRepository,
    workerId: input.workerId,
    leaseSeconds: input.leaseSeconds,
    now: input.now,
    failurePolicy: input.failurePolicy,
    observability: input.observability,
    buildOutput: async (claimed) => {
      const output = rebuildBusinessProjections({
        rawEvents: input.rawEvents,
        rfmRows: input.rfmRows,
        rebuiltAt: input.rebuiltAt ?? input.now.toISOString(),
      });
      return {
        output,
        outputWatermark: projectionOutputWatermark(claimed.job.inputWatermark, input.rawEvents, input.now),
        outputSummary: projectionOutputSummary(output),
      };
    },
    writeOutput: (output) => input.outputStore.replaceAll(output),
  });
}

function projectionOutputWatermark(
  inputWatermark: WorkerWatermark,
  rawEvents: RawEventRecord[],
  now: Date,
): WorkerWatermark {
  const sortedEvents = [...rawEvents].sort((left, right) => {
    const receivedOrder = left.receivedAt.localeCompare(right.receivedAt);
    if (receivedOrder !== 0) return receivedOrder;
    return left.eventId.localeCompare(right.eventId);
  });
  const lastEvent = sortedEvents.at(-1);
  return {
    ...inputWatermark,
    processedEventCount: rawEvents.length,
    lastReceivedAt: lastEvent?.receivedAt ?? null,
    lastEventId: lastEvent?.eventId ?? null,
    outputCommittedAt: now.toISOString(),
  };
}

function projectionOutputSummary(output: BusinessProjections): WorkerOutputSummary {
  return {
    sessions: output.sessions.length,
    carts: output.carts.length,
    orders: output.orders.length,
    payments: output.payments.length,
    refunds: output.refunds.length,
    items: output.items.length,
    menus: output.menus.length,
    members: output.members.length,
    memberRfmSnapshots: output.memberRfmSnapshots.length,
    merchantActions: output.merchantActions.length,
  };
}
