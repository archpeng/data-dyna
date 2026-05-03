export { benchmarkWorkerContract } from "./benchmark-worker.ts";
export { evidenceWorkerContract } from "./evidence-worker.ts";
export { projectionWorkerContract } from "./projection-worker.ts";
export { snapshotWorkerContract } from "./snapshot-worker.ts";
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
