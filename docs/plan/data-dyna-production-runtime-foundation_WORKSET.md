# data-dyna Production Runtime Foundation Workset

## Stage Order

- [ ] `DD-RUNTIME-S1` framework/runtime decision
- [ ] `DD-RUNTIME-S2` app config and server skeleton
- [ ] `DD-RUNTIME-S3` PostgreSQL raw event repository
- [ ] `DD-RUNTIME-S4` `/events` HTTP adapter
- [ ] `DD-RUNTIME-S5` minimal worker foundation
- [ ] `DD-RUNTIME-S6` runtime integration test gate
- [ ] `DD-RUNTIME-CLOSEOUT-S1` production runtime foundation audit

## Active Stage

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

## Slice Ownership

### `DD-RUNTIME-S1`

- Allowed repo surfaces:
  - `docs/runtime-foundation-decision.md` or equivalent short decision doc.
  - `src/app/README.md` decision pointer if needed.
  - `package.json` only if recording scripts/dependency plan requires it; do not add dependencies before the decision is recorded.
- Disallowed surfaces:
  - Framework-specific route/server implementation before the decision is accepted.
  - Full Agent runtime or provider integration.
  - Production deployment/auth/observability decisions beyond residual notes.

### `DD-RUNTIME-S2`

- Allowed repo surfaces:
  - `src/app/config/**`.
  - `src/app/server.ts`, `src/app/app.ts`, or chosen-framework equivalent.
  - `package.json` local runtime script if needed.
  - Minimal app construction tests/probes.
- Disallowed surfaces:
  - DB clients inside deterministic Core modules.
  - Production secrets or cloud deployment config.
  - Broad framework module system beyond the selected minimal runtime.

### `DD-RUNTIME-S3`

- Allowed repo surfaces:
  - `src/app/repositories/postgres-raw-event-repository.ts`.
  - Repository-specific integration tests.
  - Test/local DB connection seam under `src/app`.
- Disallowed surfaces:
  - Postgres clients in `src/ingestion` or other Core modules.
  - Projection/snapshot/benchmark/evidence repositories.
  - Idempotency weakening or event contract changes.

### `DD-RUNTIME-S4`

- Allowed repo surfaces:
  - `src/app/http/events-route.ts` or chosen-framework equivalent.
  - Route registration in app/server boundary.
  - API integration tests for `/events` and `/events/batch`.
- Disallowed surfaces:
  - Auth/tenant policy implementation beyond local placeholder boundaries.
  - Agent, merchant-review, or evidence side effects from `/events`.
  - Bypassing Zod event contracts or ingestion handlers.

### `DD-RUNTIME-S5`

- Allowed repo surfaces:
  - `src/app/workers/**` minimal worker foundation files.
  - Worker docs/contracts for projection/snapshot/benchmark/evidence scheduling boundaries.
  - Boundary probes if needed.
- Disallowed surfaces:
  - Full queue system unless already selected and accepted in `DD-RUNTIME-S1`.
  - Agent runtime execution.
  - Fake production-ready retry/dead-letter/checkpoint claims.

### `DD-RUNTIME-S6`

- Allowed repo surfaces:
  - Runtime integration test files.
  - `package.json` script `test:runtime` or equivalent.
  - Test setup fixtures for local PostgreSQL and migrated schema.
  - Validation docs pointers.
- Disallowed surfaces:
  - External services beyond local PostgreSQL.
  - Replacing unit tests with runtime tests.
  - CI rewrites not already accepted by DB gate or runtime plan.

### `DD-RUNTIME-CLOSEOUT-S1`

- Allowed repo surfaces:
  - docs/plan writeback.
  - `docs/current-architecture-and-vibecoding-review.md` runtime status/residual update.
  - Final audit and residual notes.
- Disallowed surfaces:
  - Hidden implementation outside reviewed runtime evidence.
  - Full Agent runtime or external producer integration.
  - Second plan root creation.

## Continuous Wave Ladder

| Order | Slice | Phase loop | Accepted-review next step |
|---|---|---|---|
| 1 | `DD-RUNTIME-S1` | `execute -> review` | activate `DD-RUNTIME-S2` |
| 2 | `DD-RUNTIME-S2` | `execute -> review` | activate `DD-RUNTIME-S3` |
| 3 | `DD-RUNTIME-S3` | `execute -> review` | activate `DD-RUNTIME-S4` |
| 4 | `DD-RUNTIME-S4` | `execute -> review` | activate `DD-RUNTIME-S5` |
| 5 | `DD-RUNTIME-S5` | `execute -> review` | activate `DD-RUNTIME-S6` |
| 6 | `DD-RUNTIME-S6` | `execute -> review` | activate `DD-RUNTIME-CLOSEOUT-S1` |
| 7 | `DD-RUNTIME-CLOSEOUT-S1` | `review -> accepted-writeback` | activate `PACK_COMPLETE` only if runtime foundation is audited |
| terminal | `PACK_COMPLETE` | `closeout` | repo-local closeout prompt surface |

`currentWave/maxWaves` or any scheduler wave count is not objective-completion proof; only parser truth `PACK_COMPLETE` can permit closeout.

## Hard Closeout Guard

Closeout is forbidden unless this WORKSET and `docs/plan/README.md` parse as:

```text
Active Stage: PACK_COMPLETE
Owner: closeout
State: DONE
Remaining non-deferred stages: none
```

## Expected Verification

General validation escalation as commands become available:

```bash
npm run check:boundaries
npm run check:schema-migrations
npm run test:db:migrations
npm run test:runtime
npm test
npm run typecheck
git diff --check
```

For plan/parser checks:

```bash
plan_sync /home/peng/dt-git/github/data-dyna/docs/plan
find docs/plan -maxdepth 1 -type f -name '*.md' -print | sort
```

## Execution Notes

- This pack is queued until `data-dyna-db-migration-execution-gate` reaches `PACK_COMPLETE` or a replan explicitly accepts an environment-limited alternative.
- The active stage ID is the `stepId` for active-slice `autopilot_report` calls after activation.
- `execute/completed` routes to `execution-reality-audit`, not terminal completion.
- Accepted review is the only normal point where `STATUS` / `WORKSET` should advance to the next stage.
- If a runtime slice requires Agent runtime, external producer integration, or production deployment ownership, route `needs_replan` rather than expanding scope.
- Do not weaken existing vibe-coding guardrails to make runtime implementation easier.

## Residual Queue

Known out-of-scope residuals for this pack:

- Full Pi SDK/provider Agent runtime integration.
- External producer repo instrumentation.
- Production auth/tenancy policy.
- Production deployment, secrets management, and cloud infrastructure.
- Mature observability stack, incident response, and rollback/runbook hardening.
- Full queue retry/dead-letter/checkpoint semantics unless a specific slice implements and tests them.

## Machine Queue

- active_step: `DD-RUNTIME-S1`
- latest_completed_step: `NONE`
- intended_handoff: `execute-plan`
- activation_condition: `Activate only after data-dyna-db-migration-execution-gate reaches PACK_COMPLETE or a replan explicitly accepts an environment-limited alternative.`
- latest_planning_summary: Created production runtime foundation pack as the queued successor after the DB migration execution gate.
- latest_verification:
  - `Production runtime PLAN/STATUS/WORKSET define seven proof-carrying stages plus terminal PACK_COMPLETE.`
  - `First runtime slice is a framework/runtime decision so Fastify vs NestJS is not chosen silently.`
  - `Pack explicitly excludes full Agent runtime, external producer integration, and production deployment.`
