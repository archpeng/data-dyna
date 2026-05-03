# App Worker Foundation

`DD-RUNTIME-S5` defines contract-only worker seams for future script/runner entrypoints. These files identify where projection, snapshot, benchmark, and evidence jobs belong without implementing a broker queue, production scheduler, retries, checkpoints, dead-letter handling, Agent runtime, or business mutation execution.

## Contracts

```text
src/app/workers/projection-worker.ts
src/app/workers/snapshot-worker.ts
src/app/workers/benchmark-worker.ts
src/app/workers/evidence-worker.ts
```

Each file exports a `WorkerContract` descriptor through `src/app/workers/index.ts`.

## Current mode

- invocation mode: simple `script_runner` seam, optionally invoked later by npm scripts, cron, or an external scheduler;
- implementation state: `foundation_contract_only`;
- reliability scope: queue, retry, checkpoint, and dead-letter semantics are `not_implemented`;
- runtime scope: no production scheduler, deployment, observability, Agent runtime, merchant-review side effect, or business mutation execution is implemented here.

## Future implementation rule

A future slice may turn a descriptor into executable worker code only when it also owns the required repository, runtime lifecycle, validation, and reliability semantics. Until then, these worker files are ownership boundaries and residual markers, not production-ready workers.
