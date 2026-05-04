# data-dyna Repo Plan Control Plane

## Active Pack

- `docs/plan/data-dyna-agent-runtime-integration_PLAN.md`
- `docs/plan/data-dyna-agent-runtime-integration_STATUS.md`
- `docs/plan/data-dyna-agent-runtime-integration_WORKSET.md`

## Current Active Slice

- `DD-P6-S1`
## Intended Handoff

- `execute-plan`
## Queued Successor Pack

- `docs/plan/data-dyna-production-readiness-master_PLAN.md`
- `docs/plan/data-dyna-production-readiness-master_STATUS.md`
- `docs/plan/data-dyna-production-readiness-master_WORKSET.md`
- Master tracker note: lightweight P2-P6 sequence tracker; `data-dyna-agent-runtime-integration` is the active concrete P6 pack after `data-dyna-durable-worker-foundation` reached `PACK_COMPLETE`.
- Activation note: P5 closeout accepted durable worker evidence for PostgreSQL worker jobs/checkpoints/dead letters, app-layer repository transitions, bounded executors, checkpoint recovery, idempotent rerun, retry/dead-letter audit, safe diagnostics, local/test worker observability/probe/runbook, and P6 handoff residuals. Master tracker writeback marked `DD-PR-MASTER-P5` done, activated `DD-PR-MASTER-P6`, and created `data-dyna-agent-runtime-integration` as the concrete P6 Agent runtime integration pack. Current active slice is `DD-P6-S1` for the OpenClaw-like boundary-manager contract, LLM-owned turn model, selected runtime/harness decision, and hard no-compatibility/no-fallback deletion policy.

## Autopilot Transition Contract

- `master_plan/completed` -> `wave_plan` for the current active slice when extra wave planning is needed; otherwise `execute`.
- `wave_plan/completed` -> `execute` same slice.
- `execute/completed` -> `review` same slice; execution completion is not terminal.
- `review/completed` + accepted evidence -> write back `README` / `STATUS` / `WORKSET`, activate the next unchecked stage in `Stage Order`, then route to next `wave_plan` or `execute`.
- `review/continue` -> keep the same active slice and route to `execute` for residual in-scope work.
- `closeout/done` for a concrete pack -> if a queued master tracker names the next master writeback, route `master_plan` / `plan-creator` to mark the just-closed master stage done and create or activate the next concrete pack; do not restart the completed pack.
- `needs_replan` -> `replan` with `plan-creator`.
- `blocked` / `failed` -> stop and preserve blocker evidence in `STATUS`.
- `done` is reserved for full objective completion and repo-local closeout prompt surface only.

## Completed Packs

- `docs/plan/data-dyna-autopilot_PLAN.md`
- `docs/plan/data-dyna-autopilot_STATUS.md`
- `docs/plan/data-dyna-autopilot_WORKSET.md`
- terminal state: `PACK_COMPLETE`, owner `closeout`, state `DONE`.
- `docs/plan/data-dyna-vibecoding-guardrails_PLAN.md`
- `docs/plan/data-dyna-vibecoding-guardrails_STATUS.md`
- `docs/plan/data-dyna-vibecoding-guardrails_WORKSET.md`
- terminal state: `PACK_COMPLETE`, owner `closeout`, state `DONE`.
- `docs/plan/data-dyna-db-migration-execution-gate_PLAN.md`
- `docs/plan/data-dyna-db-migration-execution-gate_STATUS.md`
- `docs/plan/data-dyna-db-migration-execution-gate_WORKSET.md`
- terminal state: `PACK_COMPLETE`, owner `closeout`, state `DONE`; residual production DB ownership remains out of scope.
- `docs/plan/data-dyna-production-runtime-foundation_PLAN.md`
- `docs/plan/data-dyna-production-runtime-foundation_STATUS.md`
- `docs/plan/data-dyna-production-runtime-foundation_WORKSET.md`
- terminal state: `PACK_COMPLETE`, owner `closeout`, state `DONE`; residual production deployment, auth/tenancy, observability, durable workers, external producers, and Agent runtime remain out of scope.
- `docs/plan/data-dyna-testable-runtime-deployment_PLAN.md`
- `docs/plan/data-dyna-testable-runtime-deployment_STATUS.md`
- `docs/plan/data-dyna-testable-runtime-deployment_WORKSET.md`
- terminal state: `PACK_COMPLETE`, owner `closeout`, state `DONE`; P1-lite Docker/testable runtime deployment was pushed at commit `6c11098`.
- `docs/plan/data-dyna-auth-tenancy-foundation_PLAN.md`
- `docs/plan/data-dyna-auth-tenancy-foundation_STATUS.md`
- `docs/plan/data-dyna-auth-tenancy-foundation_WORKSET.md`
- terminal state: `PACK_COMPLETE`, owner `closeout`, state `DONE`; P2-lite auth/tenancy closeout accepted credential, tenancy, idempotency, smoke, and residual evidence.
- `docs/plan/data-dyna-observability-foundation_PLAN.md`
- `docs/plan/data-dyna-observability-foundation_STATUS.md`
- `docs/plan/data-dyna-observability-foundation_WORKSET.md`
- terminal state: `PACK_COMPLETE`, owner `closeout`, state `DONE`; P3 observability closeout accepted redaction-safe structured logs, counters, query/runbook notes, targeted probe, and residual evidence.
- `docs/plan/data-dyna-external-producer-integration_PLAN.md`
- `docs/plan/data-dyna-external-producer-integration_STATUS.md`
- `docs/plan/data-dyna-external-producer-integration_WORKSET.md`
- terminal state: `PACK_COMPLETE`, owner `closeout`, state `DONE`; P4 external producer closeout accepted the POS order-paid contract, mapper, `/events` delivery proof, runbook/probe, replay/backfill handoff, and residual evidence.
- `docs/plan/data-dyna-durable-worker-foundation_PLAN.md`
- `docs/plan/data-dyna-durable-worker-foundation_STATUS.md`
- `docs/plan/data-dyna-durable-worker-foundation_WORKSET.md`
- terminal state: `PACK_COMPLETE`, owner `closeout`, state `DONE`; P5 durable worker closeout accepted worker schema/repository, bounded executors, checkpoint recovery, idempotent rerun, retry/dead-letter handling, worker observability/probe/runbook, and P6 handoff evidence.
- Do not resume completed packs unless a future replan explicitly reopens them.

## Autopilot Parser Invariants

These invariants are the source-of-truth guard against the closeout drift that briefly marked the active runtime pack as `PACK_COMPLETE` while it still had seven pending stages.

- `docs/plan/README.md` must point to exactly one active pack with exactly three files: `PLAN`, `STATUS`, and `WORKSET`.
- `Current Active Slice` must match the active `WORKSET` `## Active Stage` ID and every `active_step` value in the active `STATUS` / `WORKSET` machine sections.
- If `Current Active Slice` is not `PACK_COMPLETE`, it must appear as an unchecked item in active `Stage Order`, have a `####` slice definition in active `PLAN`, and hand off to the active stage owner.
- If `Current Active Slice` is `PACK_COMPLETE`, the active `WORKSET` must have zero unchecked stages, owner `closeout`, state `DONE`, and closeout handoff; otherwise route `replan` and repair parser truth before continuing.
- Accepted review writeback may activate the next pack, but it must not copy closeout `PACK_COMPLETE` state onto that successor pack unless all of that successor pack's non-deferred stages are done.
- `status: done` is reserved for full objective closeout. Ordinary accepted review of a slice should use `completed` and then write the next active slice.

## Hard Closeout Guard

- Closeout for the active pack is forbidden unless this README and the active `WORKSET` parse as active slice `PACK_COMPLETE`, owner `closeout`, state `DONE`, and no non-deferred stages remain.
- If `closeout` is dispatched while `Current Active Slice` is anything other than `PACK_COMPLETE`, treat it as a premature scheduler route and hand back to the active slice owner.
- `currentWave/maxWaves` or a human wave count is never objective-completion proof.

## Parser / Runtime Notes

- This is the single-root repo-local machine control plane for current `data-dyna` productionization planning.
- Keep this README, the active `PLAN`, `STATUS`, and `WORKSET` aligned in the same writeback turn.
- Current active-slice phase reports should use `stepId = DD-P6-S1` while this parser state remains current.
- `data-dyna-agent-runtime-integration` is active for P6 with `DD-P6-S1` ready to define the Agent boundary-manager contract, prepared attempt, selected runtime/harness path, LLM-owned turn model, and hard no-compatibility/no-fallback deletion policy before implementation.
- `data-dyna-durable-worker-foundation` reached `PACK_COMPLETE` after `DD-P5-CLOSEOUT-S1` audited accepted durable worker evidence and preserved P6 Agent runtime plus production-operations residuals.
- `data-dyna-external-producer-integration` reached `PACK_COMPLETE` after `DD-P4-S1` accepted the producer contract and source mapping, `DD-P4-S2` accepted the mapper/fixture contract proof, `DD-P4-S3` accepted non-blocking producer delivery into `/events`, `DD-P4-S4` accepted the local/test runbook, observability, replay/backfill notes, and residual handoff, and `DD-P4-CLOSEOUT-S1` accepted the P4 closeout audit before terminalization.
- `data-dyna-observability-foundation` reached `PACK_COMPLETE`; `DD-P3-S1` accepted the contract/redaction map, `DD-P3-S2` accepted structured runtime logging/correlation, `DD-P3-S3` accepted bounded ingestion metrics/counters, `DD-P3-S4` accepted observability runbook, alert/query notes, and targeted probe coverage, and `DD-P3-CLOSEOUT-S1` accepted the P3 closeout audit before terminalization.
- `data-dyna-auth-tenancy-foundation` reached `PACK_COMPLETE` after closeout audited the P2 auth/tenancy contract, schema/storage, runtime auth boundary, tenant-safe writes, smoke/runbook, and validation evidence.
- `data-dyna-production-readiness-master` now marks `DD-PR-MASTER-P5` done and tracks `DD-PR-MASTER-P6` through the active concrete `data-dyna-agent-runtime-integration` pack while preserving production-operations residuals without over-specifying post-P6 work.
- `data-dyna-testable-runtime-deployment` reached `PACK_COMPLETE` after `DD-P1-CLOSEOUT-S1` audited Dockerfile, runtime DB wiring, smoke gate, runbook, validation evidence, and residual handoff.
- `DD-P1-S4` review accepted the Docker/testable-runtime runbook and preflight evidence and advanced the pack to `DD-P1-CLOSEOUT-S1`.
- `DD-P1-S3` review accepted the runtime smoke gate evidence and advanced the pack to `DD-P1-S4`.
- `DD-P1-S2` review accepted PostgreSQL-backed server startup evidence and advanced the pack to `DD-P1-S3`.
- `DD-P1-S1` review accepted Dockerfile substrate evidence and advanced the pack to `DD-P1-S2`.
- `DD-P1-S1` started the P1 testable runtime deployment pack with a Dockerfile-first substrate and simplification policy.
- `DD-RUNTIME-S1` review accepted the runtime decision evidence and advanced the pack to `DD-RUNTIME-S2`.
- `DD-RUNTIME-S2` review accepted the app/config/server skeleton evidence and advanced the pack to `DD-RUNTIME-S3`.
- `DD-RUNTIME-S3` review accepted the PostgreSQL raw event repository evidence and advanced the pack to `DD-RUNTIME-S4`.
- `DD-RUNTIME-S4` review accepted the `/events` HTTP adapter evidence and advanced the pack to `DD-RUNTIME-S5`.
- `DD-RUNTIME-S5` review accepted the contract-only worker foundation evidence and advanced the pack to `DD-RUNTIME-S6`.
- `DD-RUNTIME-S6` review accepted the runtime integration gate evidence and advanced the pack to `DD-RUNTIME-CLOSEOUT-S1`.
- `DD-RUNTIME-CLOSEOUT-S1` review accepted the complete runtime foundation audit, preserved residuals, and marked this pack `PACK_COMPLETE`.
- `data-dyna-db-migration-execution-gate` reached `PACK_COMPLETE` after closeout audit accepted Docker PostgreSQL substrate, migration runner, migration constraint integration gate, and CI DB gate evidence.
- Use `npm run check:plan` after any parser-truth writeback before relying on autopilot continuation.
- Skill-backed routed phases require tools that include at least `read` and `autopilot_report`.
- Do not ask whether to continue as the normal path; continuation is encoded through each slice's `done_when` / `stop_boundary`.
