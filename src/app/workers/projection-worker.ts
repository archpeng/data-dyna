import {
  contractOnlyReliabilityScope,
  defineWorkerContract,
  workerFoundationResiduals,
} from "./worker-contract.ts";

export const projectionWorkerContract = defineWorkerContract({
  kind: "projection",
  modulePath: "src/app/workers/projection-worker.ts",
  owner: "src/app",
  invocationMode: "script_runner",
  implementationState: "foundation_contract_only",
  purpose: "Boundary for a future script/runner that rebuilds business projections from accepted raw events and Datamesh RFM inputs.",
  inputBoundary: "A future app adapter supplies RawEventRecord[] and Datamesh rows; this file does not create repositories or read production resources.",
  outputBoundary: "A future executor hands off BusinessProjections to an owned persistence boundary; no persistence, checkpoint, or retry code is implemented here.",
  coreBoundary: "May call deterministic projection functions in a later implementation, while keeping DB clients and runtime config outside Core modules.",
  reliability: contractOnlyReliabilityScope,
  explicitResiduals: workerFoundationResiduals,
  forbiddenRuntimeClaims: [
    "Do not claim queue/retry/dead-letter/checkpoint semantics.",
    "Do not import PostgreSQL clients into deterministic Core modules.",
    "Do not run Agent runtime or merchant-review side effects.",
  ],
});
