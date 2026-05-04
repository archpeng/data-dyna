# data-dyna Agent Runtime Integration Status

## Current State

- state: `READY`
- owner: `execute-plan`
- route: `PLAN -> EXEC -> REVIEW -> REPLAN -> CLOSEOUT`
- workstream: `data-dyna-agent-runtime-integration`
- pack_mode: `single-root docs/plan machine-compatible active-pack`
- source_truth: `docs/roadmap/data-dyna-production-readiness-roadmap.md`, completed P2 auth/tenancy pack, completed P3 observability pack, completed P4 external producer integration pack, completed P5 durable worker foundation pack, accepted P6 Agent-runtime handoff packet, OpenClaw Pi/harness boundary references

## Current Step

- active_step: `DD-P6-S2`
- active_wave: `wave-2`
- mode: `ready_for_execute`
- intended_handoff: `execute-plan`

## Planned Stages

- [x] `DD-P6-S1` boundary-manager contract and no-fallback runtime decision
- [ ] `DD-P6-S2` prepared attempt seed and read-only tool surface
- [ ] `DD-P6-S3` single Agent harness and LLM-owned turn loop
- [ ] `DD-P6-S4` runtime tool-boundary enforcement and audit
- [ ] `DD-P6-S5` result boundary, validator, and merchant-review gate
- [ ] `DD-P6-S6` Agent observability, deletion proof, and runbook
- [ ] `DD-P6-CLOSEOUT-S1` P6 closeout audit

## Immediate Focus

### `DD-P6-S2`

- Owner: `execute-plan`
- State: `READY`
- Priority: `critical`

目标：

- Build the prepared Agent attempt as a safe context seed plus read-only tool boundary, allowing the LLM to decide what to inspect while preventing unsafe data or mutation access.

必须交付：

1. Prepared attempt schema/repository or accepted local/test equivalent records worker freshness refs, context seed hash, context budget, tool catalog version, forbidden capabilities, status, and failure reasons.
2. Read-only tools expose projection/snapshot/benchmark/evidence/dead-letter summaries through typed interfaces scoped by committed freshness refs; no arbitrary SQL, raw payload, secret, peer-store identity, or worker mutation access exists.
3. Tests prove missing/stale/dead-lettered/tenant-mismatched/over-budget worker freshness fails closed and successful preparation creates a bounded seed/index for the LLM-owned turn.
4. Obsolete static context-packing or allowed-operation code is removed when replaced by the prepared-attempt/tool-catalog boundary.

done_when:

1. A prepared attempt can be created, blocked, or marked prepared with auditable worker freshness refs and no mutation side effects.
2. Agent context seed construction uses only committed worker outputs and points to read-only tools for additional LLM-selected inspection.
3. Tests prove fail-closed behavior for missing freshness, dead letters, tenant/source mismatch, forbidden raw data, and context budget overflow.
4. Replaced compatibility/static-flow code is deleted rather than kept as an alternate path.
5. `npm run test:agent`, `npm run test:app:workers`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if context preparation scans unbounded raw event history, reads raw payloads/secrets, exposes peer-store identity, or performs worker/Core mutations.
2. Stop if prepared attempts can proceed without committed worker freshness refs.
3. Stop if tenant/store/opportunity scope can be supplied by free-form Agent input rather than accepted deterministic identity.
4. Stop if this slice starts provider calls before prepared attempt/tool-boundary proof is accepted.
5. Stop if obsolete static-flow/compatibility code remains reachable after replacement.

必须避免：

1. Do not add Agent write access to worker job state or Core fact tables.
2. Do not hide stale/dead-lettered worker outputs behind best-effort context preparation.
3. Do not preselect the full reasoning path for the LLM.
## Current Execution Handoff

- wave_id: `wave-2`
- parent_step: `DD-P6-S2`
- selected_slice: `DD-P6-S2`
- next_handoff: `execute-plan`

Execution focus for the next execute phase:

1. Implement the smallest prepared-attempt seed/tool-boundary proof that satisfies `DD-P6-S2` without provider calls.
2. Preserve the accepted S1 boundary contract: prepared attempt plus read-only tools, no raw payloads/secrets/arbitrary SQL/worker mutation/Core writes/business mutation/evidence promotion, and no fallback or compatibility path.
3. Run the S2 validation ladder from the active workset before claiming execution completion.

## Current Technical Consensus

- P6 starts only because P2 auth/tenancy, P3 observability, P4 external producer integration, and P5 durable worker foundation reached `PACK_COMPLETE` with accepted evidence.
- P6 must be an OpenClaw-like boundary manager: Data Dyna prepares a safe attempt, tools, policy, prompt, audit, and result gates; the LLM owns query/reason/draft flow inside those boundaries.
- Existing Agent code (`AgentContextBundle`, safe tool descriptors, fixture sidecar execution, draft-only output, no-direct-mutation tests) is not sacred compatibility surface. P6 may delete or replace it when a simpler boundary-manager path supersedes it.
- Hard rule: no compatibility code, no old aliases, no dual-stack adapter paths, no fixture/provider/model/runtime fallback, and no architecture-iteration fallback. Missing or ambiguous runtime state fails closed.
- Agent output remains draft/hypothesis only. Deterministic validator and merchant-review gates remain required before any business action is considered.
- Production dashboards, paging, mature SLOs, incident management, cloud secrets, production deployment hardening, capacity planning, and exactly-once claims remain residual unless a later accepted pack owns them.

## Expected Validation Ladder

Always run after parser-truth edits:

```bash
npm run check:plan
git diff --check
```

For the active `DD-P6-S2` prepared-attempt/tool-surface slice:

```bash
npm run test:agent
npm run test:app:workers
npm run check:boundaries
npm run typecheck
npm test
npm run check:plan
git diff --check
```

Escalate as P6 adds runtime harness, policy enforcement, validator/review gates, observability, or deletion proof:

```bash
npm run test:agent
npm run test:review
npm run test:evidence
npm run probe:observability
npm run check:boundaries
npm run typecheck
npm test
npm run check:plan
git diff --check
```

Run worker and DB gates only when P6 changes worker freshness repository or persistence contracts:

```bash
npm run test:db:migrations
npm run test:app:workers
```

## Blockers

- None currently known for `DD-P6-S2` review.
- Live provider credentials, production Agent deployment, cloud secrets, production dashboards/SLOs/paging/incidents, and mature model operations are not prerequisites for S2 and remain residual unless a later P6 slice explicitly accepts them.

## Residuals / Notes

- Agent must not receive arbitrary SQL, raw payload reads, secret reads, worker mutation tools, Core writes, direct business mutations, or direct evidence fact promotion.
- P6 should choose one clean runtime/harness architecture. If a feature is not needed for that architecture, delete it instead of wrapping it for compatibility.
- Local/test doubles are allowed only as tests around the selected boundary; they must not become production fallback paths.
- Production operations remain residual unless an accepted slice explicitly implements and validates them.

## Master Writeback Evidence

- `data-dyna-durable-worker-foundation` reached `PACK_COMPLETE` with accepted closeout evidence.
- P5 evidence covers PostgreSQL worker jobs/attempts/checkpoints/dead letters, app-layer repository transitions, bounded deterministic executors, checkpoint recovery, idempotent rerun, retry/dead-letter audit, redaction-safe diagnostics, local/test worker observability/probe/runbook, and P6 handoff residuals.
- Master tracker writeback marks `DD-PR-MASTER-P5` done and activates `DD-PR-MASTER-P6`; this pack is the concrete P6 Agent runtime integration queue.
- P6 replan hardened the pack around boundary management, LLM-owned flow, and no compatibility/fallback/dead-code preservation.

## Latest Execution Evidence

### `DD-P6-S2` execute wave-2

- Added `src/agent/prepared-attempt.ts` with local/test prepared-attempt repository, deterministic context seed/hash, committed worker freshness refs, read-only tool catalog/surface, forbidden capability list, context budget gates, and blocked/prepared statuses.
- Added `tests/agent-prepared-attempt-s2.spec.ts` and wired it into `package.json` `test:agent` and full `test` coverage.
- Updated `src/agent/README.md` to identify `prepared-attempt.ts` as the S2 prepared-attempt/tool-boundary proof.
- Validation passed: `npm run test:agent`; `npm run test:app:workers`; `npm run check:boundaries`; `npm run typecheck`; `npm test`; `npm run check:plan`; `git diff --check`.
- Next deterministic handoff: same-slice `review` via `execution-reality-audit`; do not mark `DD-P6-S2` done until review accepts the evidence.

### `DD-P6-S1` review wave-1

- Review accepted `docs/agent/agent-runtime-boundary-contract.md` as satisfying the P6 boundary-manager contract and no-fallback runtime decision slice.
- Review reran validation: `npm run test:agent`; `npm run check:plan`; `git diff --check`.
- Parser truth advanced to `DD-P6-S2` for prepared attempt seed and read-only tool surface execution.

### `DD-P6-S1` execute wave-1

- Created `docs/agent/agent-runtime-boundary-contract.md` as the P6 boundary-manager contract artifact.
- Added `tests/agent-runtime-contract-s1.spec.ts` and wired it into `package.json` `test:agent` and full `test` coverage.
- Updated `src/agent/README.md` to link the S1 contract and mark existing fixture/`adapter.draft(...)` surfaces as pre-P6 raw material, not compatibility fallback.
- Validation passed: `npm run test:agent`; `npm run check:plan`; `git diff --check`.

## Machine State

- active_step: `DD-P6-S2`
- latest_completed_step: `DD-P6-S1`
- intended_handoff: `execute-plan`
- latest_closeout_summary: Accepted DD-P6-S1 review and activated DD-P6-S2.
- latest_verification:
  - `DD-P6-S2 execute added src/agent/prepared-attempt.ts with local/test prepared-attempt repository, context seed/hash, worker freshness refs, read-only tool descriptors/surface, forbidden capabilities, budget gates, and blocked/prepared statuses.`
  - `DD-P6-S2 execute added tests/agent-prepared-attempt-s2.spec.ts proving prepared creation, missing/stale/dead-lettered/tenant-mismatched/over-budget/forbidden-raw/free-form-identity/unsafe-tool failures, and freshness-scoped read-only tools.`
  - `Validation passed: npm run test:agent; npm run test:app:workers; npm run check:boundaries; npm run typecheck; npm test; npm run check:plan; git diff --check.`
  - `Next handoff is DD-P6-S2 review; active_step remains DD-P6-S2 until review acceptance.`
  - `src/agent/README.md`
  - `package.json`
  - `docs/plan/README.md`
  - `docs/plan/data-dyna-agent-runtime-integration_PLAN.md`
  - `docs/plan/data-dyna-agent-runtime-integration_STATUS.md`
  - `docs/plan/data-dyna-agent-runtime-integration_WORKSET.md`