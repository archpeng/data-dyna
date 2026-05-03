# data-dyna Repo Plan Control Plane

## Active Pack

- `docs/plan/data-dyna-production-runtime-foundation_PLAN.md`
- `docs/plan/data-dyna-production-runtime-foundation_STATUS.md`
- `docs/plan/data-dyna-production-runtime-foundation_WORKSET.md`

## Current Active Slice

- `PACK_COMPLETE`
## Intended Handoff

- `autopilot-closeout`
## Queued Successor Pack

- None currently defined in this control plane.
- Activation note: `data-dyna-production-runtime-foundation` was activated after `data-dyna-db-migration-execution-gate` reached `PACK_COMPLETE` with accepted local/CI PostgreSQL migration evidence.

## Autopilot Transition Contract

- `master_plan/completed` -> `wave_plan` for the current active slice when extra wave planning is needed; otherwise `execute`.
- `wave_plan/completed` -> `execute` same slice.
- `execute/completed` -> `review` same slice; execution completion is not terminal.
- `review/completed` + accepted evidence -> write back `STATUS` / `WORKSET`, activate the next unchecked stage in `Stage Order`, then route to next `wave_plan` or `execute`.
- `review/continue` -> keep the same active slice and route to `execute` for residual in-scope work.
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
- Do not resume completed packs unless a future replan explicitly reopens them.

## Hard Closeout Guard

- Closeout for the active pack is forbidden unless this README and the active `WORKSET` parse as active slice `PACK_COMPLETE`, owner `closeout`, state `DONE`, and no non-deferred stages remain.
- If `closeout` is dispatched while `Current Active Slice` is anything other than `PACK_COMPLETE`, treat it as a premature scheduler route and hand back to the active slice owner.
- `currentWave/maxWaves` or a human wave count is never objective-completion proof.

## Parser / Runtime Notes

- This is the single-root repo-local machine control plane for current `data-dyna` productionization planning.
- Keep this README, the active `PLAN`, `STATUS`, and `WORKSET` aligned in the same writeback turn.
- Active-slice phase reports should use `stepId = DD-RUNTIME-S1` while this active slice remains current.
- `data-dyna-db-migration-execution-gate` reached `PACK_COMPLETE` after closeout audit accepted Docker PostgreSQL substrate, migration runner, migration constraint integration gate, and CI DB gate evidence.
- Skill-backed routed phases require tools that include at least `read` and `autopilot_report`.
- Do not ask whether to continue as the normal path; continuation is encoded through each slice's `done_when` / `stop_boundary`.
