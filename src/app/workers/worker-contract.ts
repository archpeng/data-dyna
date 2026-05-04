export type WorkerKind = "projection" | "snapshot" | "benchmark" | "evidence";

export type WorkerInvocationMode = "script_runner";
export type WorkerImplementationState = "foundation_contract_only" | "bounded_local_executor";

export type WorkerReliabilityScope = {
  queue: "not_implemented" | "repository_backed";
  retry: "not_implemented" | "repository_backed_classified";
  checkpoint: "not_implemented" | "repository_backed_after_output_write";
  deadLetter: "not_implemented" | "repository_backed_safe_diagnostic";
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

export const boundedLocalExecutorReliabilityScope: WorkerReliabilityScope = {
  queue: "repository_backed",
  retry: "repository_backed_classified",
  checkpoint: "repository_backed_after_output_write",
  deadLetter: "repository_backed_safe_diagnostic",
};

export const workerFoundationResiduals = [
  "No broker-backed queue is implemented.",
  "No production scheduler or broker retry orchestration is implemented.",
  "No production scheduler, deployment, observability, or incident-response ownership is implemented.",
  "No Agent runtime, merchant-review side effect, or business mutation execution is implemented.",
] as const;

export function defineWorkerContract(contract: WorkerContract): WorkerContract {
  return contract;
}
