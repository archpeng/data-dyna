import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { appWorkerContracts, type WorkerContract } from "../src/app/workers/index.ts";

const expectedWorkers = ["projection", "snapshot", "benchmark", "evidence"] as const;

assert.deepEqual(
  appWorkerContracts.map((contract) => contract.kind),
  expectedWorkers,
);

for (const contract of appWorkerContracts) {
  assertWorkerContract(contract);
}

assertWorkerSourceBoundaries("src/app/workers");

function assertWorkerContract(contract: WorkerContract): void {
  assert.equal(contract.owner, "src/app");
  assert.equal(contract.invocationMode, "script_runner");
  assert.equal(contract.implementationState, "bounded_local_executor");
  assert.deepEqual(contract.reliability, {
    queue: "repository_backed",
    retry: "repository_backed_classified",
    checkpoint: "repository_backed_after_output_write",
    deadLetter: "repository_backed_safe_diagnostic",
  });
  assert.ok(existsSync(contract.modulePath), `${contract.modulePath} should exist`);
  assert.match(contract.inputBoundary, /app adapter/i);
  assert.match(contract.outputBoundary, /injected output store before checkpointing/i);
  assert.ok(contract.explicitResiduals.some((residual) => residual.includes("No broker-backed queue")));
  assert.ok(contract.explicitResiduals.some((residual) => residual.includes("No Agent runtime")));
}

function assertWorkerSourceBoundaries(root: string): void {
  const workerFiles = findTypeScriptFiles(root);
  assert.ok(workerFiles.length >= expectedWorkers.length);

  for (const file of workerFiles) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /from ["'](?:pg|fastify)["']/, `${file} must not import runtime DB or HTTP clients`);
    assert.doesNotMatch(source, /from ["'].*agent\//, `${file} must not import Agent runtime`);
    assert.doesNotMatch(source, /from ["'].*agent-sidecar/, `${file} must not import Agent sidecar runtime`);
    assert.doesNotMatch(source, /from ["'].*merchant-review\//, `${file} must not import merchant-review side effects`);
  }
}

function findTypeScriptFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(root, entry.name);
    if (entry.isDirectory()) {
      return findTypeScriptFiles(absolutePath);
    }
    if (entry.isFile() && entry.name.endsWith(".ts") && statSync(absolutePath).isFile()) {
      return [absolutePath];
    }
    return [];
  });
}
