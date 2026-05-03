# data-dyna Vibe Coding Guardrails Status

## Current State

- state: `READY`
- owner: `execute-plan`
- route: `PLAN -> EXEC -> REVIEW -> REPLAN -> CLOSEOUT`
- workstream: `data-dyna-vibecoding-guardrails`
- pack_mode: `single-root docs/plan machine-compatible`
- source_truth: `docs/current-architecture-and-vibecoding-review.md sections 8-9`

## Current Step

- active_step: `DD-VIBE-S1`
- active_wave: `wave-1`
- mode: `ready_for_execute`
- intended_handoff: `execute-plan`

## Planned Stages

- [ ] `DD-VIBE-S1` architecture boundary checker
- [ ] `DD-VIBE-S2` split validation scripts
- [ ] `DD-VIBE-S3` human-critical ownership policy
- [ ] `DD-VIBE-S4` module README contracts
- [ ] `DD-VIBE-S5` schema and migration safety checker
- [ ] `DD-VIBE-S6` service and worker adapter seam contract
- [ ] `DD-VIBE-CLOSEOUT-S1` guardrail audit and handoff

## Immediate Focus

### `DD-VIBE-S1`

- Owner: `execute-plan`
- State: `READY`
- Priority: `highest`

目标：

- Add an executable boundary check that prevents AI or human edits from introducing forbidden imports across the current module planes.

必须交付：

1. `scripts/check-boundaries.mjs` or equivalent lightweight Node script.
2. `package.json` script `check:boundaries`.
3. Probe proof that current imports pass the encoded rules.
4. Documentation pointer to the command.

done_when:

1. `npm run check:boundaries` exists and passes on the current repository.
2. The checker covers the forbidden dependency rules named in `docs/current-architecture-and-vibecoding-review.md` section 8.1.
3. The checker emits actionable file-level violations.
4. `git diff --check`, `npm run check:boundaries`, and `npm run typecheck` pass.

stop_boundary:

1. Stop and replan if satisfying a boundary rule requires moving production code across modules instead of adding a checker.
2. Stop if a rule would incorrectly ban an existing intentional deterministic contract seam and cannot be expressed as a narrow allowlist.
3. Stop before adding heavy lint/dependency frameworks unless the lightweight script cannot prove the required boundaries.

## Machine State

- active_step: `DD-VIBE-S1`
- latest_completed_step: `none`
- intended_handoff: `execute-plan`
- terminal: `false`
- previous_completed_pack: `data-dyna-autopilot` / `PACK_COMPLETE`

## Autopilot Transition Contract

- `wave_plan/completed` -> `execute` same active step.
- `execute/completed` -> `review` same active step.
- `review/completed` + accepted evidence -> update this STATUS and WORKSET, then activate the next unchecked stage.
- `review/continue` -> keep `active_step` and route to `execute` for remaining in-scope work.
- `needs_replan` -> route to `plan-creator`.
- `blocked` / `failed` -> stop and preserve blocker evidence here.
- `done` is reserved for full objective completion and repo-local closeout.

## Recently Completed

- Completed and committed the previous `data-dyna-autopilot` MVP pack as `PACK_COMPLETE`.
- Created `docs/current-architecture-and-vibecoding-review.md`, identifying executable guardrail gaps for AI-first development.
- Created this new active guardrail plan pack from that architecture review.

## Latest Evidence

- `workspace_scan` before pack creation reported `/home/peng/dt-git/github/data-dyna` on branch `main` with clean working tree and latest commit `3b4b415 docs: add architecture and vibecoding review`.
- `plan_sync /home/peng/dt-git/github/data-dyna/docs/plan` before pack creation reported the previous autopilot pack complete: 10 done / 0 pending.
- Source truth read included `docs/current-architecture-and-vibecoding-review.md` sections 6-12, `docs/plan/README.md`, `package.json`, current `src` module directories, and plan-creator autopilot references.

## Next Step

- Execute `DD-VIBE-S1` with `execute-plan`; do not start `DD-VIBE-S2` until `DD-VIBE-S1` receives accepted review evidence.

## Blockers

- None currently known.

## Gate State

- plan_pack_created: `true`
- active_pack: `docs/plan/data-dyna-vibecoding-guardrails_PLAN.md`, `docs/plan/data-dyna-vibecoding-guardrails_STATUS.md`, `docs/plan/data-dyna-vibecoding-guardrails_WORKSET.md`
- workspace_branch: `main`
- workspace_status_at_creation: `clean`
- external_repo_edits_allowed: `false unless a future explicit workset authorizes them`

## Residuals / Notes

- This pack implements vibe-coding guardrails only; it does not implement production API/worker runtime, real PostgreSQL execution, real Pi SDK runtime, or external producer integration.
- Later production work should use a separate explicit plan after these guardrails are accepted.
