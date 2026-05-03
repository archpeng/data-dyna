# data-dyna Testable Runtime Deployment Status

## Current State

- state: `READY`
- owner: `execute-plan`
- route: `PLAN -> EXEC -> REVIEW -> REPLAN -> CLOSEOUT`
- workstream: `data-dyna-testable-runtime-deployment`
- pack_mode: `single-root docs/plan machine-compatible active-pack`
- source_truth: `docs/roadmap/data-dyna-production-readiness-roadmap.md`, `docs/runtime-foundation-decision.md`, `src/app/README.md`, `docs/local-postgres.md`, completed production runtime foundation pack

## Current Step

- active_step: `DD-P1-S1`
- active_wave: `wave-1`
- mode: `ready_for_execute`
- intended_handoff: `execute-plan`

## Planned Stages

- [ ] `DD-P1-S1` Docker runtime substrate
- [ ] `DD-P1-S2` PostgreSQL-backed server startup
- [ ] `DD-P1-S3` runtime smoke gate
- [ ] `DD-P1-S4` Docker runbook and deployment preflight
- [ ] `DD-P1-CLOSEOUT-S1` P1 closeout audit

## Immediate Focus

### `DD-P1-S1`

- Owner: `execute-plan`
- State: `READY`
- Priority: `high`

目标：

- Add the minimal Dockerfile-based runtime substrate and runtime env contract needed to build and start the Fastify app without adding production platform complexity.

必须交付：

1. `Dockerfile` for the app runtime using the repo's Node 24 requirement and `npm ci` lockfile install.
2. `.dockerignore` that excludes heavy/local-only files while preserving source, migrations, package files, and runtime docs needed for the image.
3. Package scripts or documented commands for Docker build and runtime start if they reduce ambiguity.
4. `.env.example` or deployment doc updates showing the canonical runtime variables, especially `DATA_DYNA_DATABASE_URL`, `DATA_DYNA_HTTP_HOST`, and `DATA_DYNA_HTTP_PORT`.
5. Validation evidence that local non-Docker tests and parser checks still pass.

done_when:

1. `Dockerfile` exists and uses the simplest Node 24 runtime path that can start `src/app/server.ts`.
2. Docker build context is cleanly bounded by `.dockerignore` or an explicit decision not to add one.
3. Runtime env contract names the canonical variables and does not introduce compatibility aliases unless they are required by an existing test.
4. `npm ci`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop and replan if Docker build requires credentials, private registry access, or host-specific local paths.
2. Stop and replan if implementing this slice requires production auth, tenancy, observability, cloud infrastructure, or external producer ownership.
3. Stop and replan if the simplest Dockerfile requires changing deterministic Core contracts or migration semantics.

必须避免：

1. Do not add Kubernetes, Compose orchestration for multiple environments, or deployment platform abstractions in this slice.
2. Do not add compatibility shims for old runtime config names unless a failing accepted test proves the need.
3. Do not claim the service is production-deployed; this slice only creates a Docker-based testable substrate.

## Machine State

- active_step: `DD-P1-S1`
- latest_completed_step: `none`
- intended_handoff: `execute-plan`
- latest_plan_summary: Created P1 testable runtime deployment pack with Dockerfile-first execution and simplification policy.
- latest_verification:
  - `workspace_scan before planning: data-dyna main, one dirty roadmap doc from prior roadmap creation.`
  - `plan_sync before planning: completed prerequisite packs remain 0 pending; production runtime foundation is 7 done / 0 pending.`
  - `plan-creator skill and autopilot control-plane references were read before writeback.`
  - `New active pack targets P1-lite/Testable Runtime Deployment and starts with DD-P1-S1.`
- terminal: `false`

## Autopilot Transition Contract

- `master_plan/completed` -> `wave_plan` for the active slice if extra wave planning is needed; otherwise `execute`.
- `wave_plan/completed` -> `execute` same active slice.
- `execute/completed` -> `review` same active slice; execution completion is not terminal.
- `review/completed` + accepted evidence -> update `README`, this STATUS, and WORKSET, then activate the next unchecked stage.
- `review/continue` -> keep `active_step` and route to `execute` for remaining in-scope work.
- `needs_replan` -> route to `plan-creator`.
- `blocked` / `failed` -> stop and preserve blocker evidence here.
- `done` is reserved for full objective completion and repo-local closeout; do not use it for ordinary P1 slices.

## Current Technical Consensus

- Highest priority is P1-lite: make the runtime testable through Docker before adding auth/tenancy, observability, external producer integration, durable workers, or Agent runtime.
- Use a `Dockerfile` as the deployment substrate.
- Prefer the simplest architecture and code path; do not preserve compatibility shims when a direct replacement is easier to test.
- Clean up unused or duplicated code introduced by this workstream in the same slice.
- Do not change deterministic Core behavior unless the active slice explicitly owns that change and updates tests.

## Expected Validation Ladder

Always run after parser-truth edits:

```bash
npm run check:plan
git diff --check
```

Escalate through implementation slices as surfaces are added:

```bash
npm ci
npm run check:boundaries
npm run check:schema-migrations
npm run test:db:migrations
npm run test:app:repository
npm run test:runtime
npm run test:app:workers
npm run typecheck
npm test
```

Docker/runtime validation appears as the relevant slice creates commands:

```bash
docker build ...
docker run ...
npm run smoke:runtime
```

## Blockers

- None currently known.
- `docs/roadmap/data-dyna-production-readiness-roadmap.md` is an uncommitted planning artifact from the previous step and should be kept or committed with this planning work according to the user's next persistence request.

## Residuals / Notes

- P1 does not complete production auth/tenancy, mature observability, external producer instrumentation, durable queue workers, or Agent runtime.
- P1 creates a Docker-based testable runtime path; it does not claim full cloud production readiness.
- If the implementation needs secrets, private registries, external accounts, or infrastructure beyond local Docker/PostgreSQL, route `needs_replan` instead of widening the active slice.
