# data-dyna Autopilot Status

## Current State

- state: `IN_PROGRESS`
- owner: `execute-plan`
- route: `PLAN -> EXEC -> REVIEW -> REPLAN -> CLOSEOUT`
- workstream: `data-dyna-autopilot`
- pack_mode: `single-root docs/plan machine-compatible`
- source_truth: `docs/roadmap/* + docs/analyse/* + docs/stack/*`

## Current Step

- active_step: `DD-P0-S1`
- active_wave: `wave-1`
- mode: `ready_for_execution`
- intended_handoff: `execute-plan`

## Planned Stages

- [ ] `DD-P0-S1` core workspace and shared Event Contract foundation
- [ ] `DD-P0-S2` event ingestion API and raw event store
- [ ] `DD-P1-S1` external fact snapshots and business projections
- [ ] `DD-P1-S2` independent-café profile, segment, and metric snapshots
- [ ] `DD-P2-S1` peer benchmark and opportunity gap engine
- [ ] `DD-P3-S1` Pi Agent sidecar runtime foundation
- [ ] `DD-P3-S2` agent tools, prompts, skills, and deterministic validator
- [ ] `DD-P4-S1` merchant review, adoption, and action lifecycle contracts
- [ ] `DD-P5-S1` effect review, guardrail measurement, and Evidence Store
- [ ] `DD-CLOSEOUT-S1` readiness audit and next-plane handoff

## Immediate Focus

### `DD-P0-S1`

- Owner: `execute-plan`
- State: `READY`
- Priority: `highest`

目标：

- Turn the docs-only repo into the smallest runnable TypeScript workspace and define the first versioned Event Contract for the three-plane data loop.

必须交付：

1. Minimal package/workspace scaffolding for `data-dyna` implementation.
2. Shared event envelope and first event-name/domain schemas using Zod.
3. Basic test/typecheck scripts or a documented minimal validation substitute.
4. Documentation note linking the contract to roadmap/analyse SSOT decisions.

done_when:

1. A fresh executor can identify the package manager, contract source path, and validation command from repo files.
2. Event envelope includes version, source, producer, identity, correlation, entity, properties, and idempotency fields.
3. At least mini-program, POS, mobile-hq, Datamesh/system source enums are represented.
4. Contract validation has proof from a command or explicitly recorded reason if dependency install is unavailable.

stop_boundary:

1. Stop and replan if choosing a framework/package manager requires user/product approval not present in docs.
2. Stop before editing external producer repos.
3. Stop if event contract tries to encode AI recommendations as facts.
4. Stop if implementation requires secrets, Datamesh credentials, or production endpoints.

必须避免：

1. Do not build analytics dashboards in this slice.
2. Do not introduce Kafka/Flink/ClickHouse/vector DB.
3. Do not couple contract schemas to PostHog as the source of truth.
4. Do not create Agent runtime before deterministic Core scaffolding exists.

## Machine State

- active_step: `DD-P0-S1`
- active_wave: `wave-1`
- latest_completed_step: `none`
- intended_handoff: `execute-plan`
- review_handoff: `execution-reality-audit`
- replan_handoff: `plan-creator`
- closeout_handoff: `repo-local closeout prompt surface`

## Autopilot Transition Contract

- `wave_plan/completed` -> `execute` same active step.
- `execute/completed` -> `review` same active step.
- `review/completed` + accepted evidence -> update this STATUS and WORKSET, then activate the next unchecked stage.
- `review/continue` -> keep `active_step` and route to `execute` for remaining in-scope work.
- `needs_replan` -> route to `plan-creator`.
- `blocked` / `failed` -> stop and preserve blocker evidence here.
- `done` is reserved for full objective completion and repo-local closeout.

## Recently Completed

- Created initial autopilot-compatible plan pack from roadmap/analyse/stack docs.

## Next Step

- `DD-P0-S1`

## Blockers

- None currently known.

## Gate State

- plan_pack_created: `true`
- plan_sync_before_creation: `No active plans found in docs/plan`
- workspace_branch: `main`
- workspace_status_at_creation: `dirty; existing docs were uncommitted before plan pack creation`
- external_repo_edits_allowed: `false unless a future explicit workset authorizes them`

## Latest Evidence

- `workspace_scan` reported `/home/peng/dt-git/github/data-dyna` on branch `main` with changed docs.
- `plan_sync /home/peng/dt-git/github/data-dyna/docs/plan` reported no active plans before this pack.
- Source docs read include current roadmap/analyse/stack SSOT files.

## Residuals / Notes

- The next executor must not assume an existing package manager or source tree; `DD-P0-S1` owns discovering/creating the minimal implementation skeleton.
- If implementation chooses between NestJS and bare Fastify, prefer the smallest structure that can satisfy contract tests; keep NestJS only if it reduces friction with existing team patterns.
- Pi Agent work starts only at `DD-P3-S1`, after deterministic Core contract and data paths exist.
