import {
  contractOnlyReliabilityScope,
  defineWorkerContract,
  workerFoundationResiduals,
} from "./worker-contract.ts";

export const snapshotWorkerContract = defineWorkerContract({
  kind: "snapshot",
  modulePath: "src/app/workers/snapshot-worker.ts",
  owner: "src/app",
  invocationMode: "script_runner",
  implementationState: "foundation_contract_only",
  purpose: "Boundary for a future script/runner that rebuilds independent-café store, metric, and segment snapshots from business projections.",
  inputBoundary: "A future app adapter supplies BusinessProjections, brand/store/date selectors, and explicit merchant segment confirmations when present.",
  outputBoundary: "A future executor hands off IndependentCafeSnapshots to an owned persistence boundary; no persistence, checkpoint, or retry code is implemented here.",
  coreBoundary: "May call deterministic snapshot functions in a later implementation, while keeping DB clients and runtime config outside Core modules.",
  reliability: contractOnlyReliabilityScope,
  explicitResiduals: workerFoundationResiduals,
  forbiddenRuntimeClaims: [
    "Do not claim queue/retry/dead-letter/checkpoint semantics.",
    "Do not confirm restaurant segments without explicit merchant confirmation input.",
    "Do not run Agent runtime or merchant-review side effects.",
  ],
});
