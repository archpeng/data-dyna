# data-dyna Production Runtime Foundation Status

## Current State

- state: `QUEUED`
- owner: `execute-plan`
- route: `PLAN -> EXEC -> REVIEW -> REPLAN -> CLOSEOUT`
- workstream: `data-dyna-production-runtime-foundation`
- pack_mode: `single-root docs/plan machine-compatible queued-successor`
- source_truth: `src/app/README.md`, `docs/current-architecture-and-vibecoding-review.md sections 8-11`, DB gate pack outputs

## Current Step

- active_step: `DD-RUNTIME-S1`
- active_wave: `wave-1`
- mode: `queued_after_db_gate`
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
- State: `QUEUED`
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
- activation_condition: `Activate only after data-dyna-db-migration-execution-gate reaches PACK_COMPLETE or a replan explicitly accepts an environment-limited alternative.`
- latest_planning_summary: `Created production runtime foundation pack as the queued successor after the DB migration execution gate.`
- latest_verification:
  - `Production runtime PLAN/STATUS/WORKSET define seven proof-carrying stages plus terminal PACK_COMPLETE.`
  - `First runtime slice is a framework/runtime decision so Fastify vs NestJS is not chosen silently.`
  - `Pack explicitly excludes full Agent runtime, external producer integration, and production deployment.`

## Autopilot Transition Contract

- `wave_plan/completed` -> `execute` same active step.
- `execute/completed` -> `review` same active step.
- `review/completed` + accepted evidence -> update this STATUS and WORKSET, then activate the next unchecked stage.
- `review/continue` -> keep `active_step` and route to `execute` for remaining in-scope work.
- `needs_replan` -> route to `plan-creator`.
- `blocked` / `failed` -> stop and preserve blocker evidence here.
- `done` is reserved for full objective completion and repo-local closeout.

## Recently Completed

- Completed `data-dyna-vibecoding-guardrails` as `PACK_COMPLETE`.
- Created `data-dyna-db-migration-execution-gate` as the active prerequisite pack.
- Created this production runtime foundation pack as queued successor.

## Latest Evidence

- `src/app/README.md` already defines future adapter surfaces for `/events`, repositories, and workers.
- Current package scripts include guardrail checks, split tests, full `npm test`, and typecheck.
- Current code has deterministic ingestion handlers and `RawEventStore` interface ready for adapter wrapping.

## Next Step

- Wait until `data-dyna-db-migration-execution-gate` closeout activates this pack, then execute `DD-RUNTIME-S1` with `execute-plan`.

## Blockers

- Active prerequisite: `data-dyna-db-migration-execution-gate` must complete or replan before runtime implementation starts.

## Gate State

- plan_pack_created: `true`
- active_when_activated: `docs/plan/data-dyna-production-runtime-foundation_PLAN.md`, `docs/plan/data-dyna-production-runtime-foundation_STATUS.md`, `docs/plan/data-dyna-production-runtime-foundation_WORKSET.md`
- workspace_branch: `main`
- external_repo_edits_allowed: `false unless a future explicit workset authorizes them`

## Residuals / Notes

- Full Agent runtime, real Pi provider integration, external producer instrumentation, production auth/tenancy, deployment, and mature observability remain out of scope for this runtime foundation pack.
