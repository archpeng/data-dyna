import {
  boundedLocalExecutorReliabilityScope,
  defineWorkerContract,
  workerFoundationResiduals,
} from "./worker-contract.ts";
import {
  rebuildPeerBenchmarkOpportunityGaps,
  type PeerBenchmarkOpportunityGaps,
} from "../../benchmarks/opportunity-gaps.ts";
import type { MetricSnapshot, RestaurantSegmentCandidate } from "../../snapshots/independent-cafe-snapshots.ts";
import { runClaimedWorkerJob, type BoundedWorkerRunResult } from "./bounded-worker-runner.ts";
import type { WorkerJobRepository, WorkerOutputSummary, WorkerWatermark } from "./durable-worker-job-repository.ts";
import type { WorkerFailurePolicyInput } from "./worker-failure-policy.ts";
import type { WorkerObservabilityInput } from "./worker-observability.ts";

export const benchmarkWorkerContract = defineWorkerContract({
  kind: "benchmark",
  modulePath: "src/app/workers/benchmark-worker.ts",
  owner: "src/app",
  invocationMode: "script_runner",
  implementationState: "bounded_local_executor",
  purpose: "Boundary for a bounded script/runner that rebuilds aggregate-only peer benchmarks and directional opportunity gaps.",
  inputBoundary: "An app adapter supplies target and peer metric snapshots plus restaurant segment candidates; this file does not load peer stores directly.",
  outputBoundary: "The executor writes aggregate PeerBenchmarkOpportunityGaps through an injected output store before checkpointing the durable worker job.",
  coreBoundary: "Calls deterministic benchmark functions while keeping DB clients and runtime config outside Core modules.",
  reliability: boundedLocalExecutorReliabilityScope,
  explicitResiduals: workerFoundationResiduals,
  forbiddenRuntimeClaims: [
    "Do not claim exactly-once semantics from the durable job table alone.",
    "Do not expose peer store IDs or non-aggregate peer data.",
    "Do not describe benchmark gaps as causal proof.",
  ],
});

export type BenchmarkWorkerOutputStore = {
  replaceAll(gaps: PeerBenchmarkOpportunityGaps): Promise<void>;
  current?(): Promise<PeerBenchmarkOpportunityGaps | undefined>;
};

export class InMemoryBenchmarkWorkerOutputStore implements BenchmarkWorkerOutputStore {
  private latest?: PeerBenchmarkOpportunityGaps;

  async replaceAll(gaps: PeerBenchmarkOpportunityGaps): Promise<void> {
    this.latest = gaps;
  }

  async current(): Promise<PeerBenchmarkOpportunityGaps | undefined> {
    return this.latest;
  }
}

export type BenchmarkWorkerExecutionInput = {
  jobRepository: WorkerJobRepository;
  workerId: string;
  now: Date;
  leaseSeconds?: number;
  targetMetricSnapshots: MetricSnapshot[];
  targetRestaurantSegments: RestaurantSegmentCandidate[];
  peerMetricSnapshots: MetricSnapshot[];
  peerRestaurantSegments: RestaurantSegmentCandidate[];
  snapshotDate: string;
  minPeerStoreCount?: number;
  outputStore: BenchmarkWorkerOutputStore;
  failurePolicy?: WorkerFailurePolicyInput;
  observability?: WorkerObservabilityInput;
};

export async function runBenchmarkWorker(
  input: BenchmarkWorkerExecutionInput,
): Promise<BoundedWorkerRunResult<PeerBenchmarkOpportunityGaps>> {
  return runClaimedWorkerJob({
    workerKind: "benchmark",
    jobRepository: input.jobRepository,
    workerId: input.workerId,
    leaseSeconds: input.leaseSeconds,
    now: input.now,
    failurePolicy: input.failurePolicy,
    observability: input.observability,
    buildOutput: async (claimed) => {
      const output = rebuildPeerBenchmarkOpportunityGaps({
        targetMetricSnapshots: input.targetMetricSnapshots,
        targetRestaurantSegments: input.targetRestaurantSegments,
        peerMetricSnapshots: input.peerMetricSnapshots,
        peerRestaurantSegments: input.peerRestaurantSegments,
        snapshotDate: input.snapshotDate,
        minPeerStoreCount: input.minPeerStoreCount,
      });
      return {
        output,
        outputWatermark: benchmarkOutputWatermark(claimed.job.inputWatermark, input, output),
        outputSummary: benchmarkOutputSummary(output),
      };
    },
    writeOutput: (output) => input.outputStore.replaceAll(output),
  });
}

function benchmarkOutputWatermark(
  inputWatermark: WorkerWatermark,
  input: BenchmarkWorkerExecutionInput,
  output: PeerBenchmarkOpportunityGaps,
): WorkerWatermark {
  return {
    ...inputWatermark,
    snapshotDate: input.snapshotDate,
    targetMetricCount: input.targetMetricSnapshots.length,
    peerMetricCount: input.peerMetricSnapshots.length,
    opportunityGapCount: output.opportunityGaps.length,
    outputCommittedAt: input.now.toISOString(),
  };
}

function benchmarkOutputSummary(output: PeerBenchmarkOpportunityGaps): WorkerOutputSummary {
  return {
    peerGroups: output.peerGroups.length,
    peerBenchmarks: output.peerBenchmarks.length,
    opportunityGaps: output.opportunityGaps.length,
  };
}
