# data-dyna Observability Foundation Plan

## Purpose

Create the concrete P3 observability pack after P2 auth/tenancy reached `PACK_COMPLETE`. This pack makes the runtime observable enough for wider runtime expansion without introducing P4 producer integration, P5 durable workers, or P6 Agent runtime.

P3 is a local/test-operable foundation: structured logs, metrics/counters, correlation, alert/query notes, redaction policy, and validation evidence that the runtime can be diagnosed without leaking tokens, secrets, PII, or merchant-sensitive payload details.

## Source Truth

- `docs/roadmap/data-dyna-production-readiness-roadmap.md`
- `docs/plan/data-dyna-production-readiness-master_PLAN.md`
- `docs/plan/data-dyna-auth-tenancy-foundation_STATUS.md`
- `docs/plan/data-dyna-auth-tenancy-foundation_WORKSET.md`
- `docs/security/auth-tenancy-foundation.md`
- `docs/deployment/testable-runtime-deployment.md`
- runtime surfaces under `src/app/**`

## Current Baseline

P2 is complete: `/events` and `/events/batch` require one Bearer ingestion credential, accepted writes are tenant-safe, unauthorized requests do not persist side effects, tenant-policy failures persist invalid audit context only, and Docker/test smoke uses placeholder-only credentials.

P3 starts from that identity model. Observability must use credential/tenant/source/correlation metadata safely; it must not log raw tokens, secret config, full payloads, or customer/merchant-sensitive details.

## Scope

In scope:

1. P3 observability contract and redaction map.
2. Structured request/ingestion logs with request/correlation identity and safe tenant/source fields.
3. Minimal runtime counters or metrics contract for requests, errors, latency, accepted/duplicate/invalid events, and tenant-policy failures.
4. Correlation path from HTTP request to raw-event persistence/audit evidence.
5. Alert/query notes and a runbook for local/test diagnosis.
6. Tests or probes proving redaction and minimum visibility.

Out of scope:

1. Full incident-management program, mature SLO platform, or dashboard polish.
2. Vendor-specific observability infrastructure that cannot be tested locally.
3. P4 producer adapter implementation.
4. P5 durable queue implementation.
5. P6 Agent runtime, provider integration, or Agent observability beyond residual notes.
6. Cloud deployment hardening or production secret-management implementation.

## P3 Stage Definitions

#### `DD-P3-S1` — observability contract and redaction map

- Owner: `execute-plan`
- State: `READY`
- Priority: `high`

目标：

- Define the minimum P3 observability contract before runtime instrumentation changes.

交付物：

1. A source-of-truth observability document covering structured logs, counters/metrics, correlation IDs, alert/query notes, and redaction rules.
2. A safe field map from P2 auth/tenant context to logs/metrics/traces that excludes tokens, secrets, raw payload PII, and merchant-sensitive details.
3. A slice-by-slice implementation and validation ladder for the remaining P3 work.

done_when:

1. `docs/observability/runtime-observability-foundation.md` exists and names the P3 log, metric, correlation, alert/query, and redaction contract.
2. The contract maps P2 credential/tenant/source fields to safe observability fields without token or raw payload leakage.
3. P4/P5/P6 work remains residual and is not implemented inside P3-S1.
4. `npm run check:plan` and `git diff --check` pass.

stop_boundary:

1. Stop if the contract requires logging tokens, secrets, raw payload PII, or merchant-sensitive payload details.
2. Stop if the minimum observability proof depends on vendor infrastructure that cannot be locally tested or explicitly deferred.
3. Stop if P4 producer integration, P5 durable workers, or P6 Agent runtime starts inside this slice.

必须避免：

1. Do not make dashboard polish or mature SLOs a P3-S1 blocker.
2. Do not add runtime instrumentation before the redaction contract is explicit.

#### `DD-P3-S2` — structured runtime logging and correlation

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `high`

目标：

- Add minimal structured runtime logs and correlation identity for HTTP ingestion without leaking sensitive data.

交付物：

1. Runtime request/ingestion logs include request id, correlation id, route, method, status, duration, tenant/source metadata where safe, and error code when present.
2. `/events` and `/events/batch` logs distinguish accepted, duplicate, invalid, unauthorized, and tenant-policy outcomes without logging bearer tokens or full event payloads.
3. Runtime tests prove correlation/redaction behavior for authorized and unauthorized requests.

done_when:

1. Structured logs or a local-test log sink prove request and ingestion outcomes are observable with safe fields.
2. Missing/invalid credentials and tenant mismatch are logged as classified outcomes without token leakage or raw payload logging.
3. `npm run test:runtime`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if implementation would log authorization headers, credential tokens, credential JSON, or full event payloads.
2. Stop if deterministic Core imports Fastify, `pg` pool construction, logger framework code, or runtime auth code.
3. Stop if logging changes alter P2 request authorization or tenant policy behavior.

必须避免：

1. Do not introduce a heavyweight logging framework unless the existing runtime cannot support the minimal proof.
2. Do not change accepted event semantics for observability convenience.

#### `DD-P3-S3` — ingestion metrics and runtime counters

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `high`

目标：

- Add the smallest locally testable metrics/counter surface for runtime health, HTTP outcomes, event ingestion outcomes, and latency buckets or durations.

交付物：

1. Metrics or counters cover request count, error count, duration/latency, accepted events, duplicate events, invalid events, unauthorized requests, and tenant-policy failures.
2. Tests prove counters change for success, duplicate, invalid schema, unauthorized, and tenant mismatch paths.
3. Metric labels use bounded safe dimensions and avoid tokens, idempotency keys, raw payload values, and high-cardinality sensitive fields.

done_when:

1. A local/test metrics contract or runtime counter surface can answer whether requests are succeeding, failing, slow, accepted, duplicate, invalid, or tenant-policy rejected.
2. Tests cover at least one success path and the key negative paths from P2.
3. `npm run test:runtime`, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if metric labels include bearer tokens, raw event IDs, idempotency keys, customer identifiers, or unbounded payload values.
2. Stop if metrics require a cloud/vendor backend for local validation.
3. Stop if metrics hide P2 auth/tenancy residuals or change request behavior.

必须避免：

1. Do not build a full metrics platform or dashboard suite in this slice.
2. Do not let metric cardinality scale with raw event payload fields.

#### `DD-P3-S4` — observability runbook, alert/query notes, and smoke coverage

- Owner: `execute-plan`
- State: `QUEUED`
- Priority: `medium`

目标：

- Make the P3 observability proof usable by a fresh developer/operator through runbook updates, alert/query notes, and smoke/test evidence.

交付物：

1. Runbook or observability doc explains how to inspect health, errors, latency, invalid-event spikes, tenant-policy failures, and ingestion outcomes in local/test mode.
2. Alert/query notes cover DB migration failure, 5xx spike, invalid event spike, unauthorized spike, tenant mismatch spike, and future worker/Agent residuals.
3. Runtime smoke or targeted probes are updated if needed to prove observability outputs after authenticated requests.

done_when:

1. A fresh developer can run the documented local/test path and inspect the P3 logs/counters/query notes without production secrets.
2. Alert/query notes are present for the minimum P3 runtime risks and clearly mark P5/P6 worker/Agent alerts as residual until those systems exist.
3. `npm run test:runtime`, `npm run smoke:runtime` if updated, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, and `git diff --check` pass.

stop_boundary:

1. Stop if runbook instructions require real tokens, production credentials, or external infrastructure not documented as optional/residual.
2. Stop if P3 claims mature SLOs, full incident management, or production dashboard coverage without implementation evidence.
3. Stop if the smoke path would admit real producer traffic or bypass P2 auth/tenancy.

必须避免：

1. Do not make dashboard polish a blocker for minimal runtime safety.
2. Do not hide cloud observability, deployment, worker, producer, or Agent residuals.

#### `DD-P3-CLOSEOUT-S1` — P3 closeout audit

- Owner: `execution-reality-audit`
- State: `QUEUED`
- Priority: `medium`

目标：

- Audit P3 observability evidence, preserve residuals, and terminalize this pack only if the local/test observability foundation is accepted.

交付物：

1. Reality audit over the observability contract, redaction tests, structured logs, metrics/counters, runbook/query notes, and validation evidence.
2. Parser-truth writeback to `PACK_COMPLETE` only if all non-deferred P3 slices are accepted.
3. Master tracker update recommendation for `DD-PR-MASTER-P3` and P4 successor pack.
4. Residual handoff for P4 producer integration, P5 durable workers, P6 Agent runtime, cloud observability backend, production dashboarding, and mature incident/SLO work.

done_when:

1. README/PLAN/STATUS/WORKSET agree on `PACK_COMPLETE` for the P3 pack or explicitly activate the P4 successor pack.
2. P3 validation evidence exists for redaction-safe logs/counters/query notes and local/test diagnosis of success and failure paths.
3. `npm run test:runtime`, `npm run smoke:runtime` if updated, `npm run check:boundaries`, `npm run typecheck`, `npm test`, `npm run check:plan`, `git diff --check`, and `plan_sync docs/plan` pass.
4. No P4/P5/P6 completion is claimed.

stop_boundary:

1. Stop if any accepted P3 slice lacks proof and cannot be audited.
2. Stop if parser truth would mark `PACK_COMPLETE` while any non-deferred P3 stage remains unchecked.
3. Stop if closeout starts implementing P4/P5/P6 instead of preserving residuals.
4. Stop if logs or metrics leak secrets, tokens, raw payload PII, or merchant-sensitive details.

必须避免：

1. Do not terminalize the pack before redaction-safe negative evidence is accepted.
2. Do not hide production observability backend, alerting, SLO, producer, worker, Agent, or cloud deployment residuals.

#### `PACK_COMPLETE` — terminal parser state

- Owner: `closeout`
- State: `DONE`
- Priority: `terminal`

目标：

- Represent P3 observability foundation completion only after all non-deferred P3 slices have accepted review evidence.

交付物：

1. README `Current Active Slice` is `PACK_COMPLETE` for this pack.
2. WORKSET `Active Stage` is `PACK_COMPLETE` with owner `closeout` and state `DONE`.
3. Residual handoff preserves P4/P5/P6, cloud observability backend, mature SLO/incident management, and production deployment hardening as successor work.

done_when:

1. All non-deferred P3 stages have accepted review evidence or explicit residuals.
2. README/PLAN/STATUS/WORKSET parse as terminal `PACK_COMPLETE` truth.
3. Repo-local closeout has preserved validation evidence and residual handoff.

stop_boundary:

1. Stop if any previous P3 stage lacks accepted review evidence.
2. Stop if terminal state would hide P4/P5/P6 or production observability/deployment residuals.
3. Stop if parser truth still names any active slice other than `PACK_COMPLETE`.

必须避免：

1. Do not use wave count as completion proof.
2. Do not mark complete before closeout audit acceptance.

## Continuous Wave Ladder

| Order | Slice | Phase loop | Accepted-review next step |
|---|---|---|---|
| 1 | `DD-P3-S1` | `execute -> review` | activate `DD-P3-S2` |
| 2 | `DD-P3-S2` | `execute -> review` | activate `DD-P3-S3` |
| 3 | `DD-P3-S3` | `execute -> review` | activate `DD-P3-S4` |
| 4 | `DD-P3-S4` | `execute -> review` | activate `DD-P3-CLOSEOUT-S1` |
| 5 | `DD-P3-CLOSEOUT-S1` | `review -> accepted-writeback` | activate `PACK_COMPLETE` or P4 successor pack |
| terminal | `PACK_COMPLETE` | `closeout` | repo-local closeout prompt surface, then master_plan writeback for P4 |

## Autopilot Transition Contract

- `master_plan/completed` -> `wave_plan` for the active slice if extra wave planning is needed; otherwise `execute`.
- `wave_plan/completed` -> `execute` for the same active slice.
- `execute/completed` -> `review` for the same active slice; execution completion is not terminal.
- `review/completed` + accepted evidence -> update `docs/plan/README.md`, this PLAN if needed, STATUS, and WORKSET; mark the reviewed slice done; activate the next unchecked stage.
- `review/continue` -> keep the same active slice and route to `execute` for in-scope residual work.
- `closeout/done` for this concrete pack -> route `master_plan` / `plan-creator` to mark `DD-PR-MASTER-P3` done and create or activate the P4 producer-integration pack.
- `needs_replan` -> route to `plan-creator`.
- `blocked` / `failed` -> stop and preserve blocker evidence in STATUS.
- `done` is reserved for full objective completion and repo-local closeout prompt surface only.

## Hard Closeout Guard

Closeout is forbidden unless `docs/plan/README.md` and active WORKSET parse as:

```text
Active Stage: PACK_COMPLETE
Owner: closeout
State: DONE
Remaining non-deferred stages: none
```

If closeout is dispatched while any `DD-P3-*` stage is active, treat it as premature and hand back to the active slice owner/handoff.
