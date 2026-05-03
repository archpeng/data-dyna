import {
  contractOnlyReliabilityScope,
  defineWorkerContract,
  workerFoundationResiduals,
} from "./worker-contract.ts";

export const benchmarkWorkerContract = defineWorkerContract({
  kind: "benchmark",
  modulePath: "src/app/workers/benchmark-worker.ts",
  owner: "src/app",
  invocationMode: "script_runner",
  implementationState: "foundation_contract_only",
  purpose: "Boundary for a future script/runner that rebuilds aggregate-only peer benchmarks and directional opportunity gaps.",
  inputBoundary: "A future app adapter supplies target and peer metric snapshots plus restaurant segment candidates; this file does not load peer stores directly.",
  outputBoundary: "A future executor hands off aggregate PeerBenchmarkOpportunityGaps to an owned persistence boundary; no persistence, checkpoint, or retry code is implemented here.",
  coreBoundary: "May call deterministic benchmark functions in a later implementation, while keeping DB clients and runtime config outside Core modules.",
  reliability: contractOnlyReliabilityScope,
  explicitResiduals: workerFoundationResiduals,
  forbiddenRuntimeClaims: [
    "Do not claim queue/retry/dead-letter/checkpoint semantics.",
    "Do not expose peer store IDs or non-aggregate peer data.",
    "Do not describe benchmark gaps as causal proof.",
  ],
});
