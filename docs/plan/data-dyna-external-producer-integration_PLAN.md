# data-dyna External Producer Integration Plan

## Purpose

Create the concrete P4 external producer integration pack after P2 auth/tenancy and P3 observability reached `PACK_COMPLETE`.

P4 moves `/events` from local/test ingestion proof toward one smallest real producer path that can send business events safely, non-blockingly, and observably. The pilot path for this pack is POS order-paid ingestion (`source: pos`, `domain: transaction_scene`, `name: pos.order_paid`) because the roadmap prioritizes POS first and the current event contract already names POS transaction events.

This pack proves the Data Dyna-side contract, fixture mapping, delivery behavior, P2 auth/tenancy preservation, and P3 observability coverage. If an external POS runtime/repository is not available inside this repo, the pack must explicitly preserve that hookup as a residual instead of pretending it is complete.

## Source Truth

- `docs/roadmap/data-dyna-production-readiness-roadmap.md`
- `docs/plan/data-dyna-production-readiness-master_PLAN.md`
- `docs/plan/data-dyna-observability-foundation_STATUS.md`
- `docs/plan/data-dyna-observability-foundation_WORKSET.md`
- `docs/security/auth-tenancy-foundation.md`
- `docs/observability/runtime-observability-foundation.md`
- `docs/deployment/testable-runtime-deployment.md`
- `src/contracts/event-contract.ts`
- `src/ingestion/event-handlers.ts`
- `src/ingestion/raw-event-store.ts`
- `src/app/http/events-route.ts`

## Current Baseline

P2 is complete: `/events` and `/events/batch` require Bearer ingestion credentials, accepted writes are tenant-safe, unauthorized requests have no persistence side effects, and tenant-policy failures persist invalid audit context only.

P3 is complete: runtime logs and metrics cover auth rejection, accepted, duplicate, invalid schema, tenant-policy failures, request completion, duration observations, runbook/query notes, and redaction proof without requiring a production observability backend.

P4 starts from those gates. A real producer path must use the existing auth/tenancy boundary, emit Data Dyna event-contract payloads, preserve non-blocking producer behavior, and remain observable through the P3 local/test foundation.

## Scope

In scope:

1. POS order-paid pilot producer contract and source-to-target mapping.
2. Sanitized POS producer fixtures and a mapper/adapter boundary that emits `DataDynaEvent` payloads.
3. Contract/runtime tests proving accepted, duplicate, invalid, and tenant-mismatch producer paths use P2 auth/tenancy and P3 observability.
4. Non-blocking producer failure policy, retry/backfill notes, and local/test runbook updates.
5. Closeout audit and master-tracker recommendation for P5 durable worker queue foundation.

Out of scope:

1. Integrating every POS, miniapp, mobile-hq, and backend producer in one pack.
2. External repository changes unless a future slice explicitly receives authorization and source truth.
3. Bypassing P2 auth/tenancy or P3 observability for producer convenience.
4. Treating PostHog, Aegis, logs, or analytics exports as operating-fact sources.
5. P5 durable queues, retries, checkpoints, dead letters, or worker execution.
6. P6 Agent runtime consuming or acting on unvalidated producer facts.
7. Production cloud deployment, secret-management rollout, dashboarding, paging, mature SLOs, or incident management.

## P4 Stage Definitions

#### `DD-P4-S1` — pilot producer contract and POS source mapping

- Owner: `execute-plan`
- State: `READY`
- Priority: `high`

目标：

- Define the POS order-paid pilot producer contract and source-to-target mapping before implementation changes.

交付物：

1. `docs/integration/external-producer-contract.md` defines the P4 producer boundary, pilot scope, delivery semantics, retry/backfill policy, non-blocking failure policy, and residual producers.
2. `docs/integration/pos-event-mapping.md` maps a sanitized POS order-paid producer fixture into `DataDynaEvent` fields, including tenant, source, producer, correlation, entity, properties, and idempotency.
3. The contract states how P2 auth/tenancy credentials and P3 logs/metrics apply to the producer path without real secrets or production traffic.

done_when:

1. The P4 pilot path is explicitly POS `pos.order_paid`, or the slice stops with an explicit residual if no viable POS fixture can be defined from repo truth.
2. The mapping covers every required `DataDynaEvent` field and uses `idempotency.scope = store` with a deterministic producer-side key strategy.
3. Delivery, retry, backfill, and failure behavior state that Data Dyna send failure must not block POS payment/refund primary flows.
4. P5 durable workers, P6 Agent runtime, non-POS producers, production dashboarding, and external repo hookup remain residual.
5. `npm run test:contracts`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if the mapping requires real production credentials, bearer tokens, payment PANs, raw customer PII, or merchant-sensitive payload details.
2. Stop if producer data would bypass P2 auth/tenancy or P3 observability.
3. Stop if the chosen pilot requires external repo changes without explicit authorization and source truth.
4. Stop if PostHog, Aegis, logs, or analytics exports are used as operating-fact sources.

必须避免：

1. Do not implement producer code before the mapping and failure semantics are explicit.
2. Do not choose multiple producers in this first P4 slice.

#### `DD-P4-S2` — POS producer fixture mapper and contract tests

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `high`

目标：

- Add the smallest Data Dyna-side mapper/fixture proof for POS order-paid events without changing runtime auth behavior.

交付物：

1. A small producer mapping module or equivalent testable seam converts sanitized POS order-paid fixtures into `DataDynaEvent` payloads.
2. Contract tests prove the valid POS fixture parses as `source: pos`, `domain: transaction_scene`, `name: pos.order_paid`, with tenant/source/producer/correlation/idempotency fields required for P2 and P5.
3. Negative tests prove missing tenant identity, missing idempotency, wrong source/producer, or unsafe payload fields are rejected before they become accepted events.

done_when:

1. A sanitized POS order-paid fixture can be mapped to a valid `DataDynaEvent` with `idempotency.scope = store`.
2. Invalid or unsafe POS fixtures fail contract tests and do not require raw tokens, raw payment data, customer PII, or merchant-sensitive payload details.
3. Deterministic Core remains free of HTTP, DB pool construction, runtime auth, and producer delivery side effects.
4. `npm run test:contracts`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if the mapper needs to broaden `DataDynaEvent` semantics without a contract decision.
2. Stop if fixture data includes raw payment PANs, raw customer identifiers, bearer tokens, credential JSON, or production merchant data.
3. Stop if mapper code imports runtime HTTP server, PostgreSQL pool construction, or P2 auth internals into deterministic Core.
4. Stop if the work starts implementing durable queue retries instead of preserving them for P5.

必须避免：

1. Do not persist producer fixtures until the contract mapping is accepted.
2. Do not add a generic producer framework when one pilot mapper is enough.

#### `DD-P4-S3` — non-blocking producer delivery into `/events`

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `high`

目标：

- Prove the POS pilot can deliver mapped events into the authenticated `/events` runtime path without blocking producer primary flow.

交付物：

1. A minimal local/test delivery adapter or harness sends the mapped POS event to `/events` using placeholder ingestion credentials and the existing runtime auth boundary.
2. Runtime tests prove accepted and duplicate POS events persist safely, unauthorized producer sends have no side effects, and tenant/source mismatches are rejected through existing P2 policy.
3. The delivery failure policy returns classified non-blocking failure evidence without requiring the simulated POS payment/refund flow to fail.

done_when:

1. The POS pilot delivery path uses `/events` and does not bypass P2 auth/tenancy, idempotency, or P3 observability.
2. Tests cover accepted, duplicate, unauthorized, invalid, and tenant-mismatch producer outcomes.
3. Producer-send failure is classified as non-blocking and documented as retry/backfill input rather than a reason to fail POS payment/refund primary flows.
4. `npm run test:runtime`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if delivery requires real production credentials, real external network calls by default, or hardcoded secrets.
2. Stop if Data Dyna send failure can block POS payment/refund/cancel primary behavior.
3. Stop if accepted writes bypass tenant-safe idempotency or create side effects for unauthorized requests.
4. Stop if P4 changes P3 log/metric redaction rules to expose producer secrets or merchant-sensitive details.

必须避免：

1. Do not replace the existing `/events` auth contract.
2. Do not introduce a durable queue implementation in P4; preserve that for P5.

#### `DD-P4-S4` — producer runbook, observability, and replay/backfill notes

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `medium`

目标：

- Make the POS pilot producer path operable in local/test mode with documented observability, retry, replay, and backfill behavior.

交付物：

1. P4 docs explain how to run the POS producer fixture/delivery proof and inspect resulting `raw_events`, invalid events, logs, and counters.
2. Replay/backfill notes define how failed POS events are retried or replayed later without blocking POS primary flows.
3. Observability notes show which P3 log events and metric counters diagnose accepted, duplicate, invalid, unauthorized, tenant-mismatch, and delivery-failure paths.

done_when:

1. A fresh developer can run the documented local/test P4 path with placeholder credentials and inspect producer ingestion evidence without production secrets.
2. Runbook/query notes cover accepted, duplicate, invalid, unauthorized, tenant mismatch, delivery failure, retry/backfill residuals, and P5 worker handoff.
3. P4 explicitly leaves non-POS producers, durable queues, Agent runtime, production dashboarding, paging, mature SLOs, and incident management as residuals.
4. `npm run test:runtime`, `npm run probe:observability`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if runbook instructions require real tokens, production credentials, or external infrastructure not documented as optional/residual.
2. Stop if P4 claims durable worker replay, production alerting, or mature SLO coverage without implementation evidence.
3. Stop if producer observability leaks tokens, idempotency keys, raw payment/customer data, or merchant-sensitive payload details.

必须避免：

1. Do not make production dashboard polish a P4 blocker.
2. Do not hide P5/P6 and non-POS producer residuals.

#### `DD-P4-CLOSEOUT-S1` — P4 closeout audit

- Owner: `execution-reality-audit`
- State: `QUEUED`
- Priority: `medium`

目标：

- Audit P4 producer evidence, preserve residuals, and terminalize this pack only if the POS pilot path is accepted or explicitly residualized.

交付物：

1. Reality audit over the producer contract, POS mapping, fixture tests, runtime delivery proof, non-blocking failure policy, observability evidence, and runbook/replay notes.
2. Parser-truth writeback to `PACK_COMPLETE` only if all non-deferred P4 slices are accepted.
3. Master tracker update recommendation for `DD-PR-MASTER-P4` and P5 durable worker successor pack.
4. Residual handoff for non-POS producers, external repository hookup if unavailable, P5 durable workers, P6 Agent runtime, production dashboards, mature SLOs, and cloud deployment hardening.

done_when:

1. README/PLAN/STATUS/WORKSET agree on `PACK_COMPLETE` for the P4 pack or explicitly activate the P5 successor pack.
2. P4 validation evidence exists for one POS pilot producer path entering `/events` safely, or an accepted residual explains why a true external producer was unavailable.
3. P2 auth/tenancy and P3 observability evidence remain intact for accepted, duplicate, invalid, unauthorized, and tenant-mismatch producer paths.
4. `npm run test:contracts`, `npm run test:runtime`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, `git diff --check`, and `plan_sync docs/plan` pass.
5. No P5 durable worker or P6 Agent runtime completion is claimed.

stop_boundary:

1. Stop if any accepted P4 slice lacks proof and cannot be audited.
2. Stop if real producer data bypasses P2 auth/tenancy or P3 observability.
3. Stop if closeout starts implementing P5/P6 instead of preserving residuals.
4. Stop if parser truth would mark `PACK_COMPLETE` while any non-deferred P4 stage remains unchecked.

必须避免：

1. Do not terminalize P4 from mapping docs alone if runtime proof is required and missing.
2. Do not hide non-POS producer, external-repo, durable-worker, Agent, or production-operations residuals.

#### `PACK_COMPLETE` — terminal parser state

- Owner: `closeout`
- State: `DONE`
- Priority: `terminal`

目标：

- Represent P4 external producer integration completion only after all non-deferred P4 slices have accepted review evidence.

交付物：

1. README `Current Active Slice` is `PACK_COMPLETE` for this pack.
2. WORKSET `Active Stage` is `PACK_COMPLETE` with owner `closeout` and state `DONE`.
3. Residual handoff preserves P5 durable workers, P6 Agent runtime, remaining producers, cloud deployment, and production operations work as successor scope.

done_when:

1. All non-deferred P4 stages have accepted review evidence or explicit accepted residuals.
2. README/PLAN/STATUS/WORKSET parse as terminal `PACK_COMPLETE` truth.
3. Repo-local closeout has preserved validation evidence and residual handoff.

stop_boundary:

1. Stop if any previous P4 stage lacks accepted review evidence.
2. Stop if terminal state would hide P5/P6, remaining producer, external-repo, production observability, or cloud deployment residuals.
3. Stop if parser truth still names any active slice other than `PACK_COMPLETE`.

必须避免：

1. Do not use wave count as completion proof.
2. Do not mark complete before closeout audit acceptance.

## Continuous Wave Ladder

| Order | Slice | Phase loop | Accepted-review next step |
|---|---|---|---|
| 1 | `DD-P4-S1` | `execute -> review` | activate `DD-P4-S2` |
| 2 | `DD-P4-S2` | `execute -> review` | activate `DD-P4-S3` |
| 3 | `DD-P4-S3` | `execute -> review` | activate `DD-P4-S4` |
| 4 | `DD-P4-S4` | `execute -> review` | activate `DD-P4-CLOSEOUT-S1` |
| 5 | `DD-P4-CLOSEOUT-S1` | `review -> accepted-writeback` | activate `PACK_COMPLETE` or P5 successor pack |
| terminal | `PACK_COMPLETE` | `closeout` | repo-local closeout prompt surface, then master_plan writeback for P5 |

## Autopilot Transition Contract

- `master_plan/completed` created this concrete P4 pack and should hand off to `execute` for the current active slice when no extra wave planning is needed.
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
