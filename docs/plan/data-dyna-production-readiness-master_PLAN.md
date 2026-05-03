# data-dyna Production Readiness Master Plan

## Purpose

This lightweight master pack preserves the P2-P6 production-readiness sequence without over-specifying late-stage implementation details before earlier gates produce evidence.

It is a roadmap tracker under the single repo-local `docs/plan/*` control plane. It does not replace the active concrete execution pack. The active concrete pack is `data-dyna-auth-tenancy-foundation`.

## Source Truth

- `docs/roadmap/data-dyna-production-readiness-roadmap.md`
- `docs/plan/data-dyna-testable-runtime-deployment_STATUS.md`
- `docs/plan/data-dyna-testable-runtime-deployment_WORKSET.md`
- P1 closeout evidence from commit `6c11098 chore: add testable runtime deployment`

## Current Baseline

P1-lite is complete: Dockerfile-based local/test runtime, canonical `DATA_DYNA_DATABASE_URL`, PostgreSQL-backed Fastify startup, runtime smoke gate, and Docker/testable-runtime runbook.

Remaining production-readiness work must keep these boundaries explicit:

- P2 before real producer traffic: auth/tenancy and tenant-safe event writes.
- P3 before wider runtime expansion: structured logs, metrics, traces, alerts, dashboard/query notes, and redaction rules.
- P4 after P2/P3: real POS, miniapp, mobile-hq, or backend producer integration.
- P5 after real event flow exists: durable worker queue, retries, checkpoints, dead letters, and idempotent background processing.
- P6 last: Agent runtime integration with provider, validator, merchant review, audit, and no direct mutation authority.
- Cloud production deployment hardening remains an explicit residual until a deployment target is selected.

## Master Stage Definitions

#### `DD-PR-MASTER-P2` — activate and close P2-lite auth/tenancy foundation

- Owner: `plan-creator`
- State: `READY`
- Priority: `critical`

目标：

- Keep the master tracker aligned while the concrete `data-dyna-auth-tenancy-foundation` pack implements the P2-lite security gate.

交付物：

1. Active concrete P2 pack exists and owns executable P2 slices.
2. P2 closeout must prove auth/tenancy contract, tenant-safe writes, cross-tenant negative tests, and residual handoff before this master stage is marked done.
3. P3 observability pack is created or explicitly deferred after P2 evidence.

done_when:

1. `data-dyna-auth-tenancy-foundation` reaches `PACK_COMPLETE` with accepted review evidence.
2. P2 residuals and P3 successor recommendation are preserved in `docs/plan/*`.
3. Master tracker writeback marks `DD-PR-MASTER-P2` done and activates `DD-PR-MASTER-P3`.

stop_boundary:

1. Stop if P2 attempts to admit real producer traffic before auth/tenancy proof.
2. Stop if P2 changes deterministic Core facts or schema without migration tests.
3. Stop if P3/P4/P5/P6 implementation starts inside the P2 pack instead of being preserved as residuals.

必须避免：

1. Do not mark this master stage done from roadmap prose alone.
2. Do not activate P4 before P2 and P3 evidence exists.

#### `DD-PR-MASTER-P3` — create observability foundation pack after P2

- Owner: `plan-creator`
- State: `QUEUED`
- Priority: `high`

目标：

- Convert the P3 roadmap into the next concrete pack only after P2 closeout clarifies tenant identity, request identity, and redaction constraints.

交付物：

1. Concrete P3 pack with bounded slices for structured logging, metrics, trace/correlation, alert/query notes, and redaction tests.
2. P3 pack names exact validation commands and avoids broad incident-management scope.
3. P4 producer integration remains queued until P3 evidence is accepted or explicitly risk-accepted.

done_when:

1. Concrete P3 pack reaches `PACK_COMPLETE` with accepted observability evidence.
2. Runtime health/error/latency/event-ingestion visibility is auditable without leaking tokens or PII.
3. Master tracker writeback marks `DD-PR-MASTER-P3` done and activates `DD-PR-MASTER-P4`.

stop_boundary:

1. Stop if observability logs secrets, tokens, or sensitive merchant/customer details.
2. Stop if P3 adds vendor-specific infrastructure that cannot be tested locally or documented as a residual.
3. Stop if P4 real producer integration starts before minimum observability evidence exists.

必须避免：

1. Do not make dashboard polish a blocker for minimal runtime safety.
2. Do not claim mature SLO/incident management unless implemented and tested.

#### `DD-PR-MASTER-P4` — create external producer integration pack after P2/P3

- Owner: `plan-creator`
- State: `QUEUED`
- Priority: `high`

目标：

- Plan one smallest real producer path into `/events` after auth/tenancy and observability gates are in place.

交付物：

1. Concrete P4 pack chooses one pilot producer path instead of integrating POS, miniapp, mobile-hq, and backend facts all at once.
2. Producer contract includes source-to-target mapping, idempotency key generation, retry/backfill policy, and non-blocking producer failure behavior.
3. Contract tests prove producer fixtures can enter `raw_events` safely.

done_when:

1. Concrete P4 pack reaches `PACK_COMPLETE` with at least one accepted real-producer path or an explicit residual explaining why unavailable.
2. Tenant/source/correlation/idempotency fields are sufficient for downstream workers.
3. Master tracker writeback marks `DD-PR-MASTER-P4` done and activates `DD-PR-MASTER-P5`.

stop_boundary:

1. Stop if real producer data would bypass P2 auth/tenancy or P3 observability.
2. Stop if producer sending can block POS/payment/refund primary flows.
3. Stop if mapping relies on PostHog/Aegis/logs as operating-fact sources.

必须避免：

1. Do not integrate every producer in one pack.
2. Do not let Agent runtime consume unvalidated producer facts.

#### `DD-PR-MASTER-P5` — create durable worker queue foundation pack after P4

- Owner: `plan-creator`
- State: `QUEUED`
- Priority: `high`

目标：

- Plan a durable worker execution model after authenticated, observable, real event flow exists.

交付物：

1. Concrete P5 pack chooses the simplest durable execution model and names its job/checkpoint/dead-letter schema.
2. Worker tests cover bounded batch processing, retries, checkpoints, dead letters, and idempotent writes.
3. Agent runtime remains deferred until worker outputs are durable and auditable.

done_when:

1. Concrete P5 pack reaches `PACK_COMPLETE` with accepted worker durability evidence.
2. Raw event to projection/snapshot/benchmark/evidence refresh has auditable job records.
3. Master tracker writeback marks `DD-PR-MASTER-P5` done and activates `DD-PR-MASTER-P6`.

stop_boundary:

1. Stop if worker failure can silently drop data.
2. Stop if worker reruns are not idempotent.
3. Stop if Agent runtime starts before durable worker evidence exists.

必须避免：

1. Do not promise exactly-once processing without strict design and tests.
2. Do not build business mutation workers in this stage.

#### `DD-PR-MASTER-P6` — create Agent runtime integration pack last

- Owner: `plan-creator`
- State: `QUEUED`
- Priority: `medium`

目标：

- Plan controlled Agent runtime integration only after facts, permissions, observability, producers, and durable workers are ready.

交付物：

1. Concrete P6 pack covers provider integration, Agent run lifecycle, context-bundle-only inputs, tool allowlist, validator gate, merchant review handoff, cost/latency/failure audit, and no direct mutation authority.
2. Tests prove Agent output remains draft/hypothesis, not fact or action.
3. Master closeout is activated only after P6 evidence is accepted.

done_when:

1. Concrete P6 pack reaches `PACK_COMPLETE` with accepted Agent runtime evidence.
2. Agent cannot write Core fact tables, bypass validator, bypass merchant review, or call forbidden mutation tools.
3. Master tracker writeback marks `DD-PR-MASTER-P6` done and activates `DD-PR-MASTER-CLOSEOUT-S1`.

stop_boundary:

1. Stop if Agent becomes a fact source or direct business mutation actor.
2. Stop if provider failures are not auditable.
3. Stop if tool allowlist enforcement is not testable.

必须避免：

1. Do not use LLM claims as evidence records.
2. Do not let Agent runtime precede P2/P3/P5 proof.

#### `DD-PR-MASTER-CLOSEOUT-S1` — P2-P6 production-readiness master closeout

- Owner: `execution-reality-audit`
- State: `QUEUED`
- Priority: `medium`

目标：

- Audit accepted P2-P6 pack evidence and either terminalize the master tracker or preserve explicit residuals.

交付物：

1. Reality audit over P2, P3, P4, P5, and P6 closeout evidence.
2. Parser-truth writeback to `PACK_COMPLETE` only if all master stages are accepted.
3. Residual handoff for any remaining cloud deployment, compliance, operations, or product-readiness work.

done_when:

1. All P2-P6 concrete packs have accepted closeout evidence or explicit accepted residuals.
2. Master PLAN/STATUS/WORKSET parse as terminal `PACK_COMPLETE` truth.
3. No production readiness claim hides unresolved security, observability, data durability, producer, or Agent risks.

stop_boundary:

1. Stop if any P2-P6 stage lacks accepted proof and cannot be audited.
2. Stop if terminal state would hide cloud production deployment or operations residuals.
3. Stop if parser truth would mark `PACK_COMPLETE` with pending master stages.

必须避免：

1. Do not close the master from wave count alone.
2. Do not collapse P2-P6 residuals into vague “production complete” language.

## Master Handoff Law

- The master tracker is updated by `plan-creator` after each concrete pack closeout.
- The currently active concrete pack owns implementation and review.
- Late-stage details should be refined only when predecessor evidence exists.
- `PACK_COMPLETE` for the master is illegal until all non-deferred P2-P6 master stages are done.
