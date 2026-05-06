# data-dyna

Deterministic Data Core and Evidence Service foundation for independent cafés.

`data-dyna` is the operating-evidence hub for restaurant SaaS: it turns producer events, POS facts, merchant actions, benchmark gaps, Agent drafts, merchant review decisions, and measured outcomes into a reproducible evidence chain.

## Current positioning

```text
Data Core owns facts.
Agent owns hypotheses.
Validator owns safety.
Merchant owns decisions.
Evidence Store owns proof.
```

`data-dyna` is not a POS, mini-program, mobile-hq UI, PostHog replacement, or autonomous business-mutation Agent. It receives standardized facts and produces auditable operating evidence.

## Business flow

```text
Event Contract
  -> Ingestion / raw event audit
  -> Business projections
  -> Independent café snapshots and metrics
  -> Peer benchmarks and opportunity gaps
  -> Agent context / draft hypothesis
  -> Deterministic validator
  -> Merchant review / adoption lifecycle
  -> Evidence store / effect and guardrail review
```

Primary evidence question:

```text
For which type of café, which problem was found, which action was tried,
what changed, what guardrails moved, and did the merchant actually adopt it?
```

## Repository map

| Path | Owns |
|---|---|
| `src/contracts/` | Unified event contract and Zod schemas. |
| `src/ingestion/` | Event validation, raw-event persistence contract, invalid-event audit, optional PostHog mirror boundary. |
| `src/projections/` | Deterministic rebuild of sessions, carts, orders, payments, refunds, menus, members, and merchant actions. |
| `src/snapshots/` | Independent café profiles, segment candidates, metric definitions, and metric snapshots. |
| `src/benchmarks/` | Aggregate-only peer benchmarks and directional opportunity gaps. |
| `src/agent/` | Agent context, read-only prepared attempts, safe tool policy, draft artifacts, and deterministic validation. |
| `src/merchant-review/` | Merchant review, accept/reject/modify, application lifecycle, and preference confirmation contracts. |
| `src/evidence/` | Before/after effects, guardrail results, intervention trajectories, and evidence records. |
| `src/app/` | Fastify app adapters, auth boundary, runtime config, PostgreSQL repositories, producer delivery, observability, and local/test workers. |
| `migrations/` | PostgreSQL schema for raw events, projections, snapshots, benchmarks, Agent runs, review, evidence, tenancy, and worker jobs. |
| `tests/` | Slice-level contract, core, runtime, Agent, review, evidence, producer, and worker tests. |
| `docs/plan/` | Repo-local machine-readable active plan control plane. |

## Runtime and dependencies

- Node.js `>=24`
- TypeScript ESM
- Fastify for HTTP adapters
- `pg` / node-postgres for PostgreSQL adapter code
- Zod for runtime schemas and TypeScript inference
- Docker Compose for local PostgreSQL test substrate

Install:

```bash
npm install
```

Start local PostgreSQL for DB-backed gates:

```bash
npm run db:test:up
npm run db:migrate:test
```

Start the app locally:

```bash
npm run app:dev
```

## Key commands

| Command | Purpose |
|---|---|
| `npm test` | Full local regression chain. |
| `npm run test:contracts` | Event contract and producer mapping contract checks. |
| `npm run test:core` | Ingestion, projections, snapshots, and benchmarks. |
| `npm run test:agent` | Agent context, prepared attempt, runtime-contract, and validator gates. |
| `npm run test:review` | Merchant review lifecycle. |
| `npm run test:evidence` | Evidence store and guardrail verdicts. |
| `npm run test:runtime` | PostgreSQL-backed runtime route/repository integration path. |
| `npm run test:app:workers` | Durable local/test worker repository and executor checks. |
| `npm run check:boundaries` | Import boundary guardrail for Core / Agent / Evidence planes. |
| `npm run check:schema-migrations` | Schema/migration safety smoke check. |
| `npm run check:plan` | Repo-local `docs/plan` parser truth check. |
| `npm run typecheck` | TypeScript type check. |

For docs-only edits, minimum validation is:

```bash
git diff --check
```

## Active plan control plane

Current machine-readable plan entrypoint:

```text
docs/plan/README.md
```

Current active pack at the time this README was created:

```text
data-dyna-agent-runtime-integration
```

Current active slice:

```text
DD-P6-S3 — single Agent harness and LLM-owned turn loop
```

Use `docs/plan/README.md`, the active `*_STATUS.md`, and the active `*_WORKSET.md` as source of truth before continuing implementation. Do not resume completed packs unless a future replan explicitly reopens them.

## Architecture rules

1. Core modules stay deterministic: no HTTP framework, DB client, queue client, runtime config, provider credentials, or production I/O inside Core.
2. POS/payment/refund facts are authoritative for transaction outcomes; mini-program checkout events are attribution signals, not final payment facts.
3. PostHog is an async product-analytics mirror only, not the source of operating truth.
4. Peer benchmarks are aggregate-only and must not expose peer store or customer identity.
5. Agent output is `agent_draft_not_core_truth` until deterministic validation and merchant-review gates accept the next state.
6. Agent tools must not mutate orders, metrics, benchmarks, evidence facts, menus, prices, coupons, customer messages, worker state, or Core facts.
7. LLM claims must not be inserted as evidence facts.
8. Merchant review is the human decision boundary; review submission does not imply approval or business execution.
9. Production readiness must not be claimed without deployment, auth/tenancy, observability, worker reliability, provider-runtime, and external-producer proof.

## Human-critical surfaces

Treat these as high-risk and require focused review before changes:

```text
migrations/**
src/agent/agent-tools.ts
src/agent/experiment-validator.ts
src/agent/prepared-attempt.ts
src/merchant-review/**
src/evidence/**
src/app/auth/**
src/app/workers/**
```

## Source-of-truth docs

| Doc | Use when |
|---|---|
| `docs/current-architecture-and-vibecoding-review.md` | Need the current architecture and AI-coder boundary overview. |
| `docs/data-dyna-core-service-purpose.md` | Need the product/service purpose in business terms. |
| `docs/runtime-foundation-decision.md` | Need runtime decisions for Fastify, PostgreSQL, and worker seams. |
| `docs/agent/agent-runtime-boundary-contract.md` | Need the P6 Agent runtime boundary-manager contract. |
| `docs/workers/durable-worker-foundation.md` | Need accepted durable worker execution model. |
| `docs/workers/p6-agent-runtime-handoff.md` | Need P5-to-P6 Agent read-only handoff contract. |
| `docs/human-critical-review-policy.md` | Need review policy for high-risk state, evidence, and mutation-adjacent surfaces. |
| `docs/plan/README.md` | Need current repo-local active plan state. |

## Local database lifecycle

```bash
npm run db:test:up
npm run test:db:migrations
npm run test:app:repository
npm run test:runtime
npm run db:test:down
```

Reset local PostgreSQL test data:

```bash
npm run db:test:reset
npm run test:db:migrations
```

## Production status

The repository has accepted foundations for local/test runtime, auth/tenancy, observability, POS producer delivery, durable worker jobs, and the start of Agent runtime integration. It is still not a complete production system until later accepted work proves production deployment, cloud secret handling, mature observability/SLOs, provider operations, scheduler reliability, and real external-producer rollout.
