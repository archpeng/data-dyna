import {
  contractOnlyReliabilityScope,
  defineWorkerContract,
  workerFoundationResiduals,
} from "./worker-contract.ts";

export const evidenceWorkerContract = defineWorkerContract({
  kind: "evidence",
  modulePath: "src/app/workers/evidence-worker.ts",
  owner: "src/app",
  invocationMode: "script_runner",
  implementationState: "foundation_contract_only",
  purpose: "Boundary for a future script/runner that rebuilds evidence after merchant adoption and before/after metric inputs already exist.",
  inputBoundary: "A future app adapter supplies accepted experiment plans, merchant review lifecycle evidence, before/after metric snapshots, action effects, and guardrail results.",
  outputBoundary: "A future executor hands off evidence records to an owned persistence boundary; no persistence, checkpoint, or retry code is implemented here.",
  coreBoundary: "May call deterministic evidence functions in a later implementation, but must not run Agent generation, merchant-review side effects, or business mutation tools.",
  reliability: contractOnlyReliabilityScope,
  explicitResiduals: workerFoundationResiduals,
  forbiddenRuntimeClaims: [
    "Do not claim queue/retry/dead-letter/checkpoint semantics.",
    "Do not treat evidence as causal proof or accept LLM-generated claims as evidence facts.",
    "Do not run Agent runtime, merchant-review side effects, or business mutation execution.",
  ],
});
