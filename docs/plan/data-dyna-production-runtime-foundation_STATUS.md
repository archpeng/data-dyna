# data-dyna Production Runtime Foundation Status

## Current State

- state: `READY`
- owner: `execute-plan`
- route: `PLAN -> EXEC -> REVIEW -> REPLAN -> CLOSEOUT`
- workstream: `data-dyna-production-runtime-foundation`
- pack_mode: `single-root docs/plan machine-compatible active-pack`
- source_truth: `src/app/README.md`, `docs/current-architecture-and-vibecoding-review.md sections 8-11`, DB gate pack outputs

## Current Step

- active_step: `DD-RUNTIME-S1`
- active_wave: `wave-1`
- mode: `ready_for_execute`
- intended_handoff: `execute-plan`

## Planned Stages

- [ ] `DD-RUNTIME-S1` framework/runtime decision
- [ ] `DD-RUNTIME-S2` app config and server skeleton
- [ ] `DD-RUNTIME-S3` PostgreSQL raw event repository
- [ ] `DD-RUNTIME-S4` `/events` HTTP adapter
- [ ] `DD-RUNTIME-S5` minimal worker foundation
- [ ] `DD-RUNTIME-S6` runtime integration test gate
- [ ] `DD-RUNTIME-CLOSEOUT-S1` production runtime foundation audit

## Immediate Focus

### `DD-RUNTIME-S1`

- Owner: `execute-plan`
- State: `READY`
- Priority: `highest`

目标：

- Make the Fastify vs NestJS decision explicit before adding runtime dependencies or framework-specific code.

必须交付：

1. Short decision doc, for example `docs/runtime-foundation-decision.md`, comparing Fastify and NestJS for current repo needs.
2. Chosen framework, DB client, and worker mode recorded with rationale.
3. Package dependency plan that distinguishes runtime dependencies from dev/test dependencies.
4. Updated `src/app/README.md` pointer if the decision changes adapter expectations.

done_when:

1. The repo records one chosen HTTP framework and why it fits the current minimal runtime foundation.
2. The decision explicitly states whether worker foundation uses a simple script/runner, cron-style entrypoint, or queue, and what remains deferred.
3. The decision does not claim full production deployment, Agent runtime, auth, or observability is complete.
4. `git diff --check`, `npm run check:boundaries`, `npm run check:schema-migrations`, and `npm run typecheck` pass.

stop_boundary:

1. Stop if choosing Fastify vs NestJS requires unprovided production non-functional requirements.
2. Stop before adding runtime dependencies without a recorded decision.
3. Stop if the decision would require moving deterministic Core functions into `src/app`.

必须避免：

1. Do not silently pick a framework without tradeoff notes.
2. Do not overbuild a framework module system beyond `/events` and minimal worker foundation.
3. Do not start Agent runtime integration in this decision slice.

## Machine State

- active_step: `DD-RUNTIME-S1`
- latest_completed_step: `NONE`
- intended_handoff: `execute-plan`
- activation_condition: `Satisfied: data-dyna-db-migration-execution-gate reached PACK_COMPLETE with accepted local/CI PostgreSQL migration evidence.`
- latest_planning_summary: `Repaired parser truth after DB gate closeout: runtime foundation is active at DD-RUNTIME-S1, not PACK_COMPLETE.`
- latest_verification:
  - `DB gate closeout passed before commit 5de1b64: npm run db:test:reset, npm run check:schema-migrations, npm run test:db:migrations, npm run check:boundaries, npm test, npm run typecheck, and git diff --check.`
  - `Commit and push succeeded for the completed DB gate: origin/main advanced 8d660bb..5de1b64.`
  - `Runtime foundation PLAN/STATUS/WORKSET define seven proof-carrying stages plus terminal PACK_COMPLETE.`
  - `Current parser truth was repaired so README, STATUS, and WORKSET all name DD-RUNTIME-S1 with intended handoff execute-plan.`
  - `Autopilot parser invariant is now enforced by npm run check:plan.`

## Autopilot Transition Contract

- `wave_plan/completed` -> `execute` same active step.
- `execute/completed` -> `review` same active step.
- `review/completed` + accepted evidence -> update `README`, this STATUS, and WORKSET, then activate the next unchecked stage.
- `review/continue` -> keep `active_step` and route to `execute` for remaining in-scope work.
- `needs_replan` -> route to `plan-creator`.
- `blocked` / `failed` -> stop and preserve blocker evidence here.
- `done` is reserved for full objective completion and repo-local closeout; do not use it for ordinary accepted runtime slices.

## Recently Completed

- Completed `data-dyna-vibecoding-guardrails` as `PACK_COMPLETE`.
- Completed `data-dyna-db-migration-execution-gate` as `PACK_COMPLETE` and pushed commit `5de1b64`.
- Activated this production runtime foundation pack as the successor.
- Repaired closeout parser drift that had incorrectly copied `PACK_COMPLETE` state onto this active successor pack while all runtime stages were still pending.

## Latest Evidence

- `src/app/README.md` already defines future adapter surfaces for `/events`, repositories, and workers.
- Current package scripts include guardrail checks, split tests, DB migration checks, full `npm test`, typecheck, and `check:plan`.
- Current code has deterministic ingestion handlers and `RawEventStore` interface ready for adapter wrapping.
- `plan_sync docs/plan` reports this runtime pack has `0 done / 7 pending`, which is expected before `DD-RUNTIME-S1` execution.

## Next Step

- Execute `DD-RUNTIME-S1` with `execute-plan`; do not add runtime dependencies before the framework/runtime decision is recorded.

## Blockers

- None currently known. The DB gate prerequisite is complete; production deployment, auth, observability, external producer instrumentation, and Agent runtime remain out-of-scope residuals.

## Gate State

- plan_pack_created: `true`
- active_pack: `docs/plan/data-dyna-production-runtime-foundation_PLAN.md`, `docs/plan/data-dyna-production-runtime-foundation_STATUS.md`, `docs/plan/data-dyna-production-runtime-foundation_WORKSET.md`
- workspace_branch: `main`
- external_repo_edits_allowed: `false unless a future explicit workset authorizes them`

## Residuals / Notes

- Full Agent runtime, real Pi provider integration, external producer instrumentation, production auth/tenancy, deployment, and mature observability remain out of scope for this runtime foundation pack.
- Do not mark this pack `PACK_COMPLETE` until all seven runtime stages have accepted review evidence or explicit residuals and `DD-RUNTIME-CLOSEOUT-S1` is accepted.
- If autopilot dispatch reads `PACK_COMPLETE` for this pack before all runtime stages are complete, treat it as parser drift and route `replan` rather than continuing closeout.
