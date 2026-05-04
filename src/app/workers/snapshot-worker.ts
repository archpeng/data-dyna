import {
  boundedLocalExecutorReliabilityScope,
  defineWorkerContract,
  workerFoundationResiduals,
} from "./worker-contract.ts";
import type { BusinessProjections } from "../../projections/business-projections.ts";
import {
  rebuildIndependentCafeSnapshots,
  type IndependentCafeSnapshots,
  type MerchantConfirmationInput,
} from "../../snapshots/independent-cafe-snapshots.ts";
import { runClaimedWorkerJob, type BoundedWorkerRunResult } from "./bounded-worker-runner.ts";
import type { WorkerJobRepository, WorkerOutputSummary, WorkerWatermark } from "./durable-worker-job-repository.ts";
import type { WorkerFailurePolicyInput } from "./worker-failure-policy.ts";
import type { WorkerObservabilityInput } from "./worker-observability.ts";

export const snapshotWorkerContract = defineWorkerContract({
  kind: "snapshot",
  modulePath: "src/app/workers/snapshot-worker.ts",
  owner: "src/app",
  invocationMode: "script_runner",
  implementationState: "bounded_local_executor",
  purpose: "Boundary for a bounded script/runner that rebuilds independent-café store, metric, and segment snapshots from business projections.",
  inputBoundary: "An app adapter supplies BusinessProjections, brand/store/date selectors, and explicit merchant segment confirmations when present.",
  outputBoundary: "The executor writes IndependentCafeSnapshots through an injected output store before checkpointing the durable worker job.",
  coreBoundary: "Calls deterministic snapshot functions while keeping DB clients and runtime config outside Core modules.",
  reliability: boundedLocalExecutorReliabilityScope,
  explicitResiduals: workerFoundationResiduals,
  forbiddenRuntimeClaims: [
    "Do not claim exactly-once semantics from the durable job table alone.",
    "Do not confirm restaurant segments without explicit merchant confirmation input.",
    "Do not run Agent runtime or merchant-review side effects.",
  ],
});

export type SnapshotWorkerOutputStore = {
  replaceAll(snapshots: IndependentCafeSnapshots): Promise<void>;
  current?(): Promise<IndependentCafeSnapshots | undefined>;
};

export class InMemorySnapshotWorkerOutputStore implements SnapshotWorkerOutputStore {
  private latest?: IndependentCafeSnapshots;

  async replaceAll(snapshots: IndependentCafeSnapshots): Promise<void> {
    this.latest = snapshots;
  }

  async current(): Promise<IndependentCafeSnapshots | undefined> {
    return this.latest;
  }
}

export type SnapshotWorkerExecutionInput = {
  jobRepository: WorkerJobRepository;
  workerId: string;
  now: Date;
  leaseSeconds?: number;
  projections: BusinessProjections;
  brandId: string;
  storeId: string;
  snapshotDate: string;
  merchantConfirmations?: MerchantConfirmationInput[];
  outputStore: SnapshotWorkerOutputStore;
  failurePolicy?: WorkerFailurePolicyInput;
  observability?: WorkerObservabilityInput;
};

export async function runSnapshotWorker(
  input: SnapshotWorkerExecutionInput,
): Promise<BoundedWorkerRunResult<IndependentCafeSnapshots>> {
  return runClaimedWorkerJob({
    workerKind: "snapshot",
    jobRepository: input.jobRepository,
    workerId: input.workerId,
    leaseSeconds: input.leaseSeconds,
    now: input.now,
    failurePolicy: input.failurePolicy,
    observability: input.observability,
    buildOutput: async (claimed) => {
      const output = rebuildIndependentCafeSnapshots({
        projections: input.projections,
        brandId: input.brandId,
        storeId: input.storeId,
        snapshotDate: input.snapshotDate,
        merchantConfirmations: input.merchantConfirmations,
      });
      return {
        output,
        outputWatermark: snapshotOutputWatermark(claimed.job.inputWatermark, input, output),
        outputSummary: snapshotOutputSummary(output),
      };
    },
    writeOutput: (output) => input.outputStore.replaceAll(output),
  });
}

function snapshotOutputWatermark(
  inputWatermark: WorkerWatermark,
  input: SnapshotWorkerExecutionInput,
  output: IndependentCafeSnapshots,
): WorkerWatermark {
  return {
    ...inputWatermark,
    brandId: input.brandId,
    storeId: input.storeId,
    snapshotDate: input.snapshotDate,
    metricSnapshotCount: output.metricSnapshots.length,
    segmentCandidateCount: output.restaurantSegments.length,
    outputCommittedAt: input.now.toISOString(),
  };
}

function snapshotOutputSummary(output: IndependentCafeSnapshots): WorkerOutputSummary {
  return {
    storeProfileSnapshots: output.storeProfileSnapshots.length,
    metricDefinitions: output.metricDefinitions.length,
    metricSnapshots: output.metricSnapshots.length,
    restaurantSegments: output.restaurantSegments.length,
    merchantConfirmations: output.merchantConfirmations.length,
  };
}
