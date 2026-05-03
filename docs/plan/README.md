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
- Activation note: `data-dyna-production-runtime-foundation` was activated after `data-dyna-db-migration-execution-gate` reached `PACK_COMPLETE` with accepted local/CI PostgreSQL migration evidence and commit `5de1b64` pushed to `origin/main`.

## Autopilot Transition Contract

- `master_plan/completed` -> `wave_plan` for the current active slice when extra wave planning is needed; otherwise `execute`.
- `wave_plan/completed` -> `execute` same slice.
- `execute/completed` -> `review` same slice; execution completion is not terminal.
- `review/completed` + accepted evidence -> write back `README` / `STATUS` / `WORKSET`, activate the next unchecked stage in `Stage Order`, then route to next `wave_plan` or `execute`.
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
- Active-slice phase reports should use `stepId = PACK_COMPLETE` only for repo-local closeout after this pack is terminal.
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
