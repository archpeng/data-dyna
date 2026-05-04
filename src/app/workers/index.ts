export {
  benchmarkWorkerContract,
  InMemoryBenchmarkWorkerOutputStore,
  runBenchmarkWorker,
  type BenchmarkWorkerExecutionInput,
  type BenchmarkWorkerOutputStore,
} from "./benchmark-worker.ts";
export {
  readWorkerResumeWatermark,
  runClaimedWorkerJob,
  type BoundedWorkerRunResult,
  type BoundedWorkerRunStatus,
  type RunClaimedWorkerJobInput,
} from "./bounded-worker-runner.ts";
export {
  PostgresWorkerJobRepository,
  type ClaimWorkerJobInput,
  type ClaimedWorkerJob,
  type EnqueueWorkerJobInput,
  type PostgresWorkerJobClient,
  type WorkerFailureClass,
  type WorkerFreshnessRecord,
  type WorkerJobAttemptRecord,
  type WorkerJobRecord,
  type WorkerJobRepository,
  type WorkerJobStatus,
  type WorkerOutputSummary,
  type WorkerSafeDiagnostic,
  type WorkerSourceScope,
  type WorkerTenantScope,
  type WorkerWatermark,
} from "./durable-worker-job-repository.ts";
export {
  evidenceWorkerContract,
  InMemoryEvidenceWorkerOutputStore,
  runEvidenceWorker,
  type EvidenceWorkerExecutionInput,
  type EvidenceWorkerOutput,
  type EvidenceWorkerOutputStore,
} from "./evidence-worker.ts";
export { projectionWorkerContract, runProjectionWorker, type ProjectionWorkerExecutionInput } from "./projection-worker.ts";
export {
  snapshotWorkerContract,
  InMemorySnapshotWorkerOutputStore,
  runSnapshotWorker,
  type SnapshotWorkerExecutionInput,
  type SnapshotWorkerOutputStore,
} from "./snapshot-worker.ts";
export {
  classifyWorkerFailure,
  persistWorkerFailure,
  WorkerExecutionError,
  type PersistedWorkerFailure,
  type WorkerFailureDecision,
  type WorkerFailurePolicyInput,
  type WorkerFailureReasonCode,
} from "./worker-failure-policy.ts";
export {
  recordWorkerJobCheckpointed,
  recordWorkerJobCompleted,
  recordWorkerJobFailed,
  recordWorkerJobStarted,
  type WorkerObservabilityInput,
} from "./worker-observability.ts";
export type {
  WorkerContract,
  WorkerImplementationState,
  WorkerInvocationMode,
  WorkerKind,
  WorkerReliabilityScope,
} from "./worker-contract.ts";

import { benchmarkWorkerContract } from "./benchmark-worker.ts";
import { evidenceWorkerContract } from "./evidence-worker.ts";
import { projectionWorkerContract } from "./projection-worker.ts";
import { snapshotWorkerContract } from "./snapshot-worker.ts";

export const appWorkerContracts = [
  projectionWorkerContract,
  snapshotWorkerContract,
  benchmarkWorkerContract,
  evidenceWorkerContract,
] as const;
