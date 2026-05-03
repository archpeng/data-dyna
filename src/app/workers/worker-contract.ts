export type WorkerKind = "projection" | "snapshot" | "benchmark" | "evidence";

export type WorkerInvocationMode = "script_runner";
export type WorkerImplementationState = "foundation_contract_only";

export type WorkerReliabilityScope = {
  queue: "not_implemented";
  retry: "not_implemented";
  checkpoint: "not_implemented";
  deadLetter: "not_implemented";
};

export type WorkerContract = {
  kind: WorkerKind;
  modulePath: `src/app/workers/${string}`;
  owner: "src/app";
  invocationMode: WorkerInvocationMode;
  implementationState: WorkerImplementationState;
  purpose: string;
  inputBoundary: string;
  outputBoundary: string;
  coreBoundary: string;
  reliability: WorkerReliabilityScope;
  explicitResiduals: readonly string[];
  forbiddenRuntimeClaims: readonly string[];
};

export const contractOnlyReliabilityScope: WorkerReliabilityScope = {
  queue: "not_implemented",
  retry: "not_implemented",
  checkpoint: "not_implemented",
  deadLetter: "not_implemented",
};

export const workerFoundationResiduals = [
  "No broker-backed queue is implemented.",
  "No production retry, checkpoint, or dead-letter guarantee is implemented.",
  "No production scheduler, deployment, observability, or incident-response ownership is implemented.",
  "No Agent runtime, merchant-review side effect, or business mutation execution is implemented.",
] as const;

export function defineWorkerContract(contract: WorkerContract): WorkerContract {
  return contract;
}
