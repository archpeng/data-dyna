# data-dyna Durable Worker Foundation Plan

## Purpose

Create the concrete P5 durable worker foundation pack after P4 external producer integration reached `PACK_COMPLETE`.

P5 turns the existing contract-only worker seams into a durable, auditable, recoverable background-processing foundation for the deterministic Data Core. It must process accepted `raw_events` into projections, snapshots, benchmarks, and evidence records without silently dropping data, corrupting facts on rerun, or starting P6 Agent runtime early.

This pack also creates the handoff surface that P6 Agent runtime can later consume: bounded, evidence-backed, tenant-scoped worker outputs and freshness metadata. Inspired by OpenClaw's embedded Pi architecture, P5 should maximize LLM/Pi readiness by producing typed capabilities, durable run records, bounded context inputs, tool-policy-friendly seams, and explicit residuals. It must not embed a live Pi/LLM runtime, model provider, production dashboard, paging policy, mature SLO, or incident-management program in P5.

## Source Truth

- `docs/roadmap/data-dyna-production-readiness-roadmap.md`
- `docs/plan/data-dyna-production-readiness-master_PLAN.md`
- `docs/plan/data-dyna-production-readiness-master_STATUS.md`
- `docs/plan/data-dyna-production-readiness-master_WORKSET.md`
- `docs/plan/data-dyna-external-producer-integration_STATUS.md`
- `docs/plan/data-dyna-external-producer-integration_WORKSET.md`
- `docs/integration/external-producer-contract.md`
- `docs/integration/pos-event-mapping.md`
- `docs/security/auth-tenancy-foundation.md`
- `docs/observability/runtime-observability-foundation.md`
- `docs/deployment/testable-runtime-deployment.md`
- `src/app/workers/README.md`
- `src/app/workers/worker-contract.ts`
- `src/app/workers/index.ts`
- `tests/app-workers-s5.spec.ts`
- OpenClaw/Pi reference inputs read for planning only: `/home/peng/dt-git/github/openclaw/docs/pi.md`, `/home/peng/dt-git/github/openclaw/docs/pi-dev.md`, `/home/peng/dt-git/github/openclaw/docs/plugins/sdk-agent-harness.md`, `/home/peng/dt-git/github/openclaw/docs/plugins/skill-workshop.md`

## Current Baseline

P2 is complete: `/events` requires bearer ingestion credentials, accepted writes are tenant-safe, tenant-scoped idempotency is enforced, unauthorized requests have no persistence side effects, and tenant-policy failures persist invalid audit context only.

P3 is complete: runtime logs and metrics cover auth rejection, accepted, duplicate, invalid schema, tenant-policy failures, request completion, duration observations, redaction proof, and local/test query/probe notes.

P4 is complete: one POS `pos.order_paid` producer path maps to `DataDynaEvent`, delivers through authenticated `POST /events`, proves accepted/duplicate/invalid/unauthorized/tenant-mismatch/transient-send-failure behavior, and documents replay/backfill handoff while preserving P5/P6/production residuals.

Runtime worker seams exist but are contract-only. `src/app/workers/**` currently declares projection, snapshot, benchmark, and evidence worker ownership boundaries with `queue`, `retry`, `checkpoint`, and `deadLetter` all `not_implemented`.

## OpenClaw/Pi Usage Principles Adapted for P5

P5 borrows these OpenClaw/Pi patterns as design constraints for worker durability and future Agent readiness:

1. **Embedded runtime separation**: OpenClaw prepares a run before an agent harness executes it. P5 should prepare durable, typed worker jobs before executors process them; executors must not pick facts ad hoc from hidden state.
2. **Tool/capability allowlists**: OpenClaw filters and normalizes tools before exposing them to models. P5 worker APIs should be typed capabilities such as enqueue, claim, checkpoint, complete, retry, and dead-letter; no arbitrary SQL or mutation surface should be handed to P6.
3. **Session/run persistence**: OpenClaw persists session trees and harness ids. P5 must persist worker job attempts, checkpoints, watermarks, errors, and output freshness so later Agent runs can cite durable evidence rather than chat memory.
4. **Context budgeting/compaction**: OpenClaw handles context overflow and pruning. P5 should produce bounded worker handoff summaries and freshness markers that later Agent context bundles can consume without scanning unbounded raw history.
5. **Provider/runtime fail-closed policy**: OpenClaw separates provider/model resolution from runtime harness execution and fails explicit runtimes strictly. P5 must fail closed on ambiguous worker ownership, missing idempotency, missing checkpoint evidence, or unsafe P6/LLM shortcuts.
6. **Streaming/event observability**: OpenClaw subscribes to structured session events. P5 should emit structured worker lifecycle evidence and metrics, but production dashboards, paging, mature SLOs, and incident process remain residual.
7. **Skill/procedural memory caution**: OpenClaw separates procedural skills from factual memory. P5 may document repeatable worker operations, but facts must remain in Data Core tables, not LLM memory or worker prose.

## Scope

In scope:

1. Choose and document the smallest durable execution model for P5, expected to prefer a PostgreSQL-backed job/checkpoint/dead-letter foundation unless S1 finds a blocker.
2. Define durable job, attempt, checkpoint, watermark, retry, dead-letter, and idempotent-write contracts for projection, snapshot, benchmark, and evidence workers.
3. Implement repository/runtime seams that keep deterministic Core free of DB clients, HTTP servers, queue clients, provider SDKs, Agent runtime, and production dashboard dependencies.
4. Prove bounded batch processing, rerun idempotency, checkpoint recovery, retry limits, dead-letter state, and safe failure audit through tests/probes.
5. Produce a P6 handoff packet describing what durable worker outputs, freshness metadata, and typed read-only capabilities a future Agent runtime may consume.

Out of scope:

1. P6 Agent runtime, Pi provider integration, model auth/profile rotation, live LLM calls, Agent sessions, or provider failover execution.
2. Agent direct mutation of facts, merchant-review side effects, or business action execution.
3. Production dashboard implementation, paging/on-call rules, mature SLOs, incident-management process, cloud observability backend selection, and capacity planning.
4. Distributed broker operations, cross-region scheduling, and exactly-once claims unless explicitly designed and tested in this pack.
5. Expanding non-POS producer integration beyond accepted P4 residuals.

## P5 Stage Definitions

#### `DD-P5-S1` — durable worker contract and execution-model decision

- Owner: `execute-plan`
- State: `READY`
- Priority: `critical`

目标：

- Define the P5 durable worker contract, execution model, OpenClaw/Pi-inspired handoff principles, and residual boundaries before schema or worker implementation.

交付物：

1. `docs/workers/durable-worker-foundation.md` defines the selected minimal execution model, job lifecycle, checkpoint/watermark contract, retry/dead-letter policy, idempotent-write rules, and worker DAG from raw events to projections/snapshots/benchmarks/evidence.
2. The contract maps current `src/app/workers/**` contract-only seams to future executable worker boundaries without importing runtime clients into deterministic Core.
3. The contract defines a P6 handoff surface: durable worker outputs, freshness metadata, and typed read-only capabilities a future Agent runtime may consume, while leaving Pi/LLM runtime execution residual.
4. The contract explicitly preserves production dashboards, paging, mature SLOs, incident management, cloud hardening, non-POS producers, and P6 Agent runtime as residuals.

done_when:

1. A bounded P5 execution model is selected or the slice stops with explicit reasons why the repo cannot choose one from current truth.
2. Job, attempt, checkpoint, retry, dead-letter, idempotency, observability, and P6 handoff contracts are documented without implementation claims.
3. OpenClaw/Pi lessons are translated into typed worker capabilities, durable run records, bounded context handoff, and fail-closed policy rather than live Agent runtime work.
4. `npm run test:app:workers`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if the worker contract requires a broker, cloud scheduler, production dashboard, paging policy, mature SLO, or incident process as a P5 prerequisite instead of documenting it as residual.
2. Stop if P5 starts P6 Agent runtime, live Pi provider integration, model auth, or LLM execution.
3. Stop if the contract would allow silent data loss, non-idempotent reruns, arbitrary SQL capabilities, or Agent direct mutation of facts.
4. Stop if the selected model bypasses P2 tenant identity, P3 observability, or accepted P4 producer idempotency evidence.

必须避免：

1. Do not implement schema or worker code before the durable contract is accepted.
2. Do not use OpenClaw/Pi inspiration to smuggle P6 runtime into P5.

#### `DD-P5-S2` — durable job schema and repository seam

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `critical`

目标：

- Add the minimal persistent job, attempt, checkpoint, and dead-letter substrate for durable worker execution.

交付物：

1. SQL migrations define bounded worker job/checkpoint/dead-letter tables or an accepted equivalent with tenant/store scope, worker kind, input watermark, status, attempts, error classification, timestamps, and idempotency identity.
2. App-layer repository interfaces and implementations create, claim, heartbeat, checkpoint, complete, retry, and dead-letter jobs without importing DB clients into deterministic Core.
3. Tests cover migration safety, repository idempotency, concurrent claim behavior where applicable, bounded retry counts, and explicit dead-letter state.

done_when:

1. Durable job records can be created, claimed, checkpointed, completed, retried, and dead-lettered with auditable status transitions.
2. Rerunning or re-enqueueing the same deterministic worker input does not create ambiguous duplicate jobs or corrupt checkpoint state.
3. Deterministic Core remains free of `pg`, Fastify, queue clients, provider SDKs, and Agent runtime imports.
4. `npm run test:db:migrations`, `npm run test:app:workers`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if schema changes cannot be validated by migration gates.
2. Stop if worker job identity lacks tenant/source/watermark/idempotency fields needed for safe reruns.
3. Stop if repository code mixes Core business functions with DB/client construction.
4. Stop if retry/dead-letter state is only logged in prose and not persisted.

必须避免：

1. Do not claim exactly-once processing from a job table alone.
2. Do not introduce a distributed broker unless S1 explicitly accepted that model and tests cover it.

#### `DD-P5-S3` — bounded worker executors and checkpointed deterministic processing

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `high`

目标：

- Turn contract-only projection, snapshot, benchmark, and evidence worker seams into bounded executable adapters that process deterministic inputs and update checkpoints safely.

交付物：

1. Worker executors process bounded batches from accepted raw events or prior durable outputs through existing deterministic Core functions.
2. Each executor records checkpoint/watermark progress only after owned output writes succeed.
3. Tests prove successful processing, repeated execution idempotency, checkpoint resume, and no hidden Agent/merchant-review side effects.

done_when:

1. Projection, snapshot, benchmark, and evidence worker paths have executable local/test adapters or explicit accepted residuals for any worker not yet safely executable.
2. Checkpoint updates prevent silent data loss and do not advance past failed writes.
3. Worker outputs remain deterministic facts/evidence, not LLM conclusions or business mutations.
4. `npm run test:app:workers`, `npm run test:evidence`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if a worker needs Agent-generated hypotheses, merchant decisions, or production external services to complete P5 evidence.
2. Stop if rerun idempotency cannot be proven for a worker output.
3. Stop if checkpoint advancement can hide partially failed output writes.
4. Stop if worker execution imports HTTP server, provider SDK, or Agent runtime into deterministic Core.

必须避免：

1. Do not broaden worker scope to business mutation execution.
2. Do not process unbounded raw history in tests when a bounded batch proof is enough.

#### `DD-P5-S4` — retry, dead-letter, and failure-classification proof

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `high`

目标：

- Prove bounded retry, failure audit, and dead-letter behavior for durable workers without hiding failed data.

交付物：

1. Retry policy implementation classifies transient, contract, tenant, idempotency, and unexpected worker failures with bounded attempts and safe backoff metadata.
2. Dead-letter records preserve enough safe evidence to diagnose failed jobs without raw payload secret leakage or merchant-sensitive dumps.
3. Tests prove retry count is bounded, dead-letter state is explicit, failed checkpoints do not advance, and successful reruns complete idempotently.

done_when:

1. Worker failures are persisted with reason, attempt count, next action, and safe diagnostic fields.
2. Dead-lettered jobs are queryable and do not disappear from the durable worker audit trail.
3. Retry/dead-letter behavior does not require P6 Agent runtime or production incident tooling.
4. `npm run test:app:workers`, `npm run probe:observability`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if failed jobs can be dropped, overwritten, or only observed through logs.
2. Stop if dead-letter payloads expose bearer tokens, idempotency keys, raw payment/customer data, or merchant-sensitive payload details.
3. Stop if retry loops can hot-loop or block producer primary flows.
4. Stop if production paging or mature incident management becomes necessary for correctness rather than residual operations maturity.

必须避免：

1. Do not rely on dashboards as the only dead-letter evidence.
2. Do not auto-invoke Agent remediation for failed worker jobs in P5.

#### `DD-P5-S5` — worker observability, probe, and operator runbook

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `medium`

目标：

- Make durable worker behavior inspectable in local/test mode with redaction-safe logs, counters, lag/failure evidence, and a replay/dead-letter runbook.

交付物：

1. Worker observability uses P3-style structured logs and bounded metric labels for started, completed, retried, checkpointed, failed, dead-lettered, and lag/duration paths.
2. A targeted local/test probe or equivalent test prints safe worker evidence for successful processing, retry, checkpoint resume, and dead-letter diagnosis.
3. Runbook notes explain safe SQL/query shapes, replay/dead-letter handling, and residual production dashboard/SLO/incident handoff.

done_when:

1. A fresh developer can run the documented local/test worker path and inspect job/checkpoint/dead-letter evidence without production secrets.
2. Logs/metrics/probe output cover success, retry, failure, dead-letter, checkpoint, and lag/duration paths with bounded safe labels.
3. Production dashboards, paging, mature SLOs, incident management, cloud observability backend selection, and capacity planning remain residuals.
4. `npm run test:app:workers`, `npm run probe:observability`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if observability leaks tokens, idempotency keys, raw payment/customer data, raw payloads, or merchant-sensitive details.
2. Stop if local/test proof requires production infrastructure or real external services.
3. Stop if P5 claims production dashboards, paging, mature SLOs, or incident-management completion.
4. Stop if runbook replay guidance can corrupt facts or bypass idempotency.

必须避免：

1. Do not make dashboard polish a P5 blocker.
2. Do not hide production-operations residuals behind local/test observability.

#### `DD-P5-S6` — P6 Agent-runtime handoff packet and residual gate

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `medium`

目标：

- Produce the bounded, evidence-first handoff P6 needs from durable workers while explicitly keeping Agent runtime and production operations residual.

交付物：

1. `docs/workers/p6-agent-runtime-handoff.md` or equivalent section defines which durable worker outputs and freshness metadata may feed future `AgentContextBundle` construction.
2. The handoff defines typed read-only capabilities and forbidden mutation/tool surfaces, borrowing OpenClaw/Pi patterns for prepared attempts, tool allowlists, runtime ownership, session/run audit, context budgets, and fail-closed runtime selection.
3. Residual map states P6 still owns live Pi provider integration, Agent run lifecycle, tool policy enforcement, validator/merchant-review gates, provider failure/cost audit, and no-direct-mutation tests.
4. Residual map states production dashboarding, paging, mature SLOs, incident management, cloud secrets, deployment hardening, and capacity planning are not completed by P5.

done_when:

1. P6 can start from a durable, tenant-scoped, bounded context handoff instead of scanning raw worker internals or trusting LLM memory.
2. The handoff lists explicit allowed read capabilities and forbidden mutation/provider/runtime capabilities.
3. P5 does not claim live Agent runtime, Pi provider integration, model failover, production dashboarding, paging, mature SLOs, or incident-management completion.
4. `npm run test:app:workers`, `npm run test:agent`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if the handoff needs live LLM calls, provider credentials, Agent sessions, model auth, or production runtime selection to pass.
2. Stop if Agent would receive arbitrary SQL, raw payloads, secrets, or direct mutation tools.
3. Stop if LLM output is treated as fact, evidence, or merchant decision.
4. Stop if production dashboards/SLOs/incidents are claimed without implemented evidence.

必须避免：

1. Do not use P6 handoff docs to skip the future P6 concrete pack.
2. Do not create Agent mutation authority in P5.

#### `DD-P5-CLOSEOUT-S1` — P5 closeout audit

- Owner: `execution-reality-audit`
- State: `QUEUED`
- Priority: `medium`

目标：

- Audit durable worker evidence, preserve residuals, and terminalize this pack only if worker durability and P6 handoff evidence are accepted.

交付物：

1. Reality audit over worker contract, schema/repository, executor behavior, checkpoints, retries, dead letters, observability, probe/runbook, and P6 handoff residuals.
2. Parser-truth writeback to `PACK_COMPLETE` only if all non-deferred P5 slices are accepted.
3. Master tracker update recommendation for `DD-PR-MASTER-P5` and P6 Agent runtime successor pack.
4. Residual handoff for Agent runtime/provider integration, production dashboards, paging, mature SLOs, incident management, cloud deployment hardening, and any worker limitations accepted as residual.

done_when:

1. README/PLAN/STATUS/WORKSET agree on `PACK_COMPLETE` for the P5 pack or explicitly activate the P6 successor pack.
2. Durable worker evidence exists for bounded processing, idempotent rerun, checkpoint recovery, retry limits, and dead-letter audit.
3. P6 handoff evidence exists without claiming live Agent runtime, Pi provider integration, or direct mutation authority.
4. `npm run test:db:migrations`, `npm run test:app:workers`, `npm run probe:observability`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, `git diff --check`, and `plan_sync docs/plan` pass.
5. No P6 Agent runtime or production dashboard/SLO/incident completion is claimed.

stop_boundary:

1. Stop if any accepted P5 slice lacks proof and cannot be audited.
2. Stop if worker failures can silently drop data or reruns are not idempotent.
3. Stop if closeout starts implementing P6 or production operations instead of preserving residuals.
4. Stop if parser truth would mark `PACK_COMPLETE` while any non-deferred P5 stage remains unchecked.

必须避免：

1. Do not terminalize P5 from contract docs alone if runtime worker proof is required and missing.
2. Do not hide Agent, dashboard, SLO, incident, cloud, or unresolved worker residuals.

#### `PACK_COMPLETE` — terminal parser state

- Owner: `closeout`
- State: `DONE`
- Priority: `terminal`

目标：

- Represent P5 durable worker foundation completion only after all non-deferred P5 slices have accepted review evidence.

交付物：

1. README `Current Active Slice` is `PACK_COMPLETE` for this pack.
2. WORKSET `Active Stage` is `PACK_COMPLETE` with owner `closeout` and state `DONE`.
3. Residual handoff preserves P6 Agent runtime, production dashboards/SLOs/incidents, cloud deployment, capacity planning, and any non-deferred worker limitations accepted as residuals.

done_when:

1. All non-deferred P5 stages have accepted review evidence or explicit accepted residuals.
2. README/PLAN/STATUS/WORKSET parse as terminal `PACK_COMPLETE` truth.
3. Repo-local closeout has preserved validation evidence and residual handoff.

stop_boundary:

1. Stop if any previous P5 stage lacks accepted review evidence.
2. Stop if terminal state would hide P6 Agent runtime, production operations, or worker durability residuals.
3. Stop if parser truth still names any active slice other than `PACK_COMPLETE`.

必须避免：

1. Do not use wave count as completion proof.
2. Do not mark complete before closeout audit acceptance.

## Continuous Wave Ladder

| Order | Slice | Phase loop | Accepted-review next step |
|---|---|---|---|
| 1 | `DD-P5-S1` | `execute -> review` | activate `DD-P5-S2` |
| 2 | `DD-P5-S2` | `execute -> review` | activate `DD-P5-S3` |
| 3 | `DD-P5-S3` | `execute -> review` | activate `DD-P5-S4` |
| 4 | `DD-P5-S4` | `execute -> review` | activate `DD-P5-S5` |
| 5 | `DD-P5-S5` | `execute -> review` | activate `DD-P5-S6` |
| 6 | `DD-P5-S6` | `execute -> review` | activate `DD-P5-CLOSEOUT-S1` |
| 7 | `DD-P5-CLOSEOUT-S1` | `review -> accepted-writeback` | activate `PACK_COMPLETE` or P6 successor pack |
| terminal | `PACK_COMPLETE` | `closeout` | repo-local closeout prompt surface, then master_plan writeback for P6 |

## Autopilot Transition Contract

- `master_plan/completed` created this concrete P5 pack and should hand off to `execute` for the current active slice when no extra wave planning is needed.
- `wave_plan/completed` dispatches `execute` for the same slice.
- `execute/completed` dispatches same-slice `review`; execution completion is not terminal.
- `review/completed` plus accepted evidence is the only normal writeback point for marking the reviewed slice done and activating the next unchecked `Stage Order` item.
- `review/continue` keeps the same active slice and routes to `execute` for residual in-scope work.
- `needs_replan` routes to `replan` with `plan-creator`.
- `blocked` / `failed` stops and preserves blocker evidence in STATUS/WORKSET.
- `done` is reserved for full objective closeout after parser truth reaches `PACK_COMPLETE`.

## Hard Closeout Guard

- Closeout is forbidden unless README and the active WORKSET parse as active slice `PACK_COMPLETE`, owner `closeout`, state `DONE`, and no non-deferred stages remain.
- If closeout is dispatched while `Current Active Slice` is anything other than `PACK_COMPLETE`, treat it as premature and hand back to the active slice owner.
- `currentWave/maxWaves` or human wave count is not objective-completion proof.
