# data-dyna Autopilot Plan

## Goal

Build `data-dyna` from the current documentation-only repository into a practical Data Core / Evidence Service for independent cafés, with a deterministic `data-dyna-core` and a controlled Pi Agent-based `data-dyna-agent` sidecar.

The plan preserves the roadmap consensus:

```text
小程序负责用户行为；
POS 负责交易现场；
mobile-hq 联邦项目族负责商户动作和采纳；
Datamesh / backend services provide factual sources；
Data Core owns facts；
Pi Agent generates hypotheses, not truth；
Validator enforces safety；
Merchant confirms action；
Evidence proves outcome。
```

## Scope

In scope:

- Create a minimal TypeScript service/workspace in this repo.
- Define versioned Event Contract schemas and shared IDs.
- Implement deterministic event ingestion and raw event persistence.
- Implement PostgreSQL-first projections for orders, carts, members, RFM snapshots, actions, effects, guardrails, and evidence.
- Consume Datamesh RFM facts as snapshots instead of recalculating RFM in MVP.
- Implement independent-café profile, segment, metric, benchmark, and opportunity gap layers.
- Add Pi Agent sidecar runtime using Pi SDK first; keep RPC as later isolation option.
- Add bounded high-level Pi Agent tools, prompts, skills, run audit, and deterministic validation.
- Expose merchant review/adoption and effect review contracts for `mobile-hq` integration.
- Keep PostHog as product analytics sink, never core fact source.
- Add lightweight tests/probes and docs evidence for every slice.

## Non-Goals

- No Kafka/Flink/Spark/Lakehouse in MVP.
- No ClickHouse/vector DB until PostgreSQL bottleneck or retrieval pressure exists.
- No self-built generic analytics replacement for PostHog.
- No direct edits to external repos (`mini-homepage-h5`, `pos-lite-cashier`, `mobile-hq`, `hq-bff-service`, `g-hq-orchestrator`) unless a later explicit workset slice authorizes it.
- No silent AI menu/price/coupon changes.
- No Agent writes to core fact tables.
- No cross-merchant personal retargeting or ad network features.
- No first-version RFM recalculation; use `report.crm.member_labels` snapshots.

## Deliverables

1. Runnable minimal TypeScript project with contract/test/DB scaffolding.
2. Event Contract and ingestion path that can receive the three-plane loop.
3. PostgreSQL schema/migrations for deterministic Core facts and Evidence Store.
4. Workers/projections for Data Core MVP snapshots and metrics.
5. Peer benchmark and opportunity gap model for independent-café use cases.
6. Pi Agent sidecar with session/tool/prompt/skill/audit/validator boundaries.
7. Merchant review and effect review APIs/events.
8. Autopilot-compatible writeback history in `docs/plan/*`.

## Constraints

- Current repo started as docs-only; implementation must begin with minimal scaffolding.
- Prefer simple TypeScript / NestJS or Fastify / Zod / PostgreSQL / pg-boss.
- Deterministic Core is the source of truth; AI/Agent is a sidecar.
- Every slice must leave proof: tests, typecheck, schema validation, migration check, or documented probe.
- Every later integration with external repos must preserve current producer boundaries from roadmap docs.
- If this pack runs under extension autopilot, each phase ends with exactly one `autopilot_report`.
- Active-slice phases use `stepId` equal to the active slice ID.
- Default continuation is automatic; use `done_when` / `stop_boundary` instead of “ask whether to continue”.

## Verification

Baseline lightweight verification for all slices:

```bash
git diff --check
find docs/plan -maxdepth 1 -type f -name '*.md' -print | sort
```

Implementation slices should add the narrowest relevant checks, for example:

```bash
npm test
npm run typecheck
npm run lint
npm run db:migrate:check
npm run build
```

If a command is not yet available, the slice must either create it or record why the current stage can only validate with a smaller proof.

## Blockers / Risks

- External production APIs and Datamesh credentials may not be available in local execution.
- Existing related repositories are outside this repo and may require separate owner approval before code changes.
- Event contracts can drift if three-plane producers are integrated before shared schemas are stable.
- Agent scope can expand into action execution unless tool policy remains strict.
- Cross-merchant benchmark requires aggregation and privacy thresholds before production use.

## Source Documents

This plan synthesizes:

- `docs/data-dyna-core-service-purpose.md`
- `docs/roadmap/control-plane-data-core-integration-roadmap.md`
- `docs/roadmap/independent-cafe-data-first-mvp-roadmap.md`
- `docs/roadmap/mvp-menu-growth-copilot-roadmap.md`
- `docs/roadmap/conversation-continuity-and-assistant-runtime.md`
- `docs/analyse/data-dyna-three-step-technical-method.md`
- `docs/analyse/data-dyna-step3-scaling-law-intervention-hypothesis.md`
- `docs/analyse/restaurant-saas-scaling-law-and-sales-data.md`
- `docs/analyse/independent-cafe-focused-scaling-law-feasibility.md`
- `docs/analyse/stack/independent-cafe-data-flywheel-minimal-stack.md`
- `docs/stack/data-dyna-core-and-pi-agent-sidecar-architecture.md`

## Continuous Wave Ladder

```text
DD-P0-S1 core workspace + event contract
  -> DD-P0-S2 ingestion + raw event store
  -> DD-P1-S1 external fact snapshots + projections
  -> DD-P1-S2 independent-café profile + metrics
  -> DD-P2-S1 peer benchmark + opportunity gaps
  -> DD-P3-S1 Pi Agent sidecar runtime
  -> DD-P3-S2 agent tools/prompts/validator
  -> DD-P4-S1 merchant review + adoption contracts
  -> DD-P5-S1 effect/guardrail/evidence loop
  -> DD-CLOSEOUT-S1 readiness audit + handoff
```

Accepted review of each stage activates the next stage in this order. Do not jump over intermediate slices.

## Slice Definitions

#### `DD-P0-S1` — core workspace and shared Event Contract foundation

- Owner: `execute-plan`
- State: `READY`
- Priority: `highest`

目标：

- Turn the docs-only repo into the smallest runnable TypeScript workspace and define the first versioned Event Contract for the three-plane data loop.

交付物：

1. Minimal package/workspace scaffolding for `data-dyna` implementation.
2. Shared event envelope and first event-name/domain schemas using Zod.
3. Basic test/typecheck scripts or a documented minimal validation substitute.
4. Documentation note linking the contract to roadmap/analyse SSOT decisions.

Verification target:

1. Run the newly created contract tests or schema validation command.
2. Run `git diff --check`.
3. Confirm `DD-P0-S1` outputs do not modify external repos.

done_when:

1. A fresh executor can identify the package manager, contract source path, and validation command from repo files.
2. Event envelope includes version, source, producer, identity, correlation, entity, properties, and idempotency fields.
3. At least mini-program, POS, mobile-hq, Datamesh/system source enums are represented.
4. Contract validation has proof from a command or explicitly recorded reason if dependency install is unavailable.

stop_boundary:

1. Stop and replan if choosing a framework/package manager requires user/product approval not present in docs.
2. Stop before editing external producer repos.
3. Stop if event contract tries to encode AI recommendations as facts.
4. Stop if implementation requires secrets, Datamesh credentials, or production endpoints.

必须避免：

1. Do not build analytics dashboards in this slice.
2. Do not introduce Kafka/Flink/ClickHouse/vector DB.
3. Do not couple contract schemas to PostHog as the source of truth.
4. Do not create Agent runtime before deterministic Core scaffolding exists.

#### `DD-P0-S2` — event ingestion API and raw event store

- Owner: `execute-plan`
- State: `queued`
- Priority: `highest`

目标：

- Implement deterministic ingestion for single and batch events, persist raw validated events, and prepare asynchronous product analytics sink boundaries.

交付物：

1. `POST /events` and `POST /events/batch` or equivalent local service handlers.
2. PostgreSQL schema/migration for `raw_events` and invalid event recording.
3. Idempotency handling design or implementation.
4. PostHog sink boundary as async optional sink, not fact source.

Verification target:

1. API/unit tests for valid event, invalid event, duplicate idempotency key, and batch behavior.
2. Migration check or SQL snapshot validation.
3. `git diff --check`.

done_when:

1. Valid contract events can be accepted and persisted.
2. Invalid contract events are rejected or quarantined with reason.
3. Raw event persistence stores original properties and normalized searchable fields.
4. PostHog forwarding, if present, is explicitly async and non-authoritative.

stop_boundary:

1. Stop if ingestion would block POS/payment critical path semantics.
2. Stop if implementation requires production DB credentials.
3. Stop if PostHog becomes the only persistence path.

必须避免：

1. Do not compute metrics directly from controller code.
2. Do not silently drop validation failures without audit.

#### `DD-P1-S1` — external fact snapshots and business projections

- Owner: `execute-plan`
- State: `queued`
- Priority: `high`

目标：

- Add deterministic projections for orders, carts, members, menus, actions, and Datamesh RFM snapshots so raw events can become business facts.

交付物：

1. Schema/migrations for sessions, carts, orders, order_items, payments, refunds, items, menus, members, member_profiles, member_rfm_snapshots.
2. Worker/task skeleton for projection rebuilds.
3. Datamesh RFM adapter contract targeting `report.crm.member_labels` without recalculating RFM.
4. Projection tests using fixture events/facts.

Verification target:

1. Projection tests over fixtures.
2. Migration/schema validation.
3. `git diff --check`.

done_when:

1. Raw event fixtures can produce deterministic projection rows.
2. RFM snapshot model includes 30/90/180 day tag fields and 90-day pay metrics from docs.
3. Projection code keeps frontend payment success as attribution helper, not final order truth.
4. Rebuild path is idempotent or explicitly designed for idempotency.

stop_boundary:

1. Stop if live Datamesh access/secrets are required instead of fixture/contract work.
2. Stop before treating POS/frontend events as final order/payment/refund truth.
3. Stop if schema expands into unrelated BI parity.

必须避免：

1. Do not recalculate RFM in MVP.
2. Do not mutate external source services.

#### `DD-P1-S2` — independent-café profile, segment, and metric snapshots

- Owner: `execute-plan`
- State: `queued`
- Priority: `high`

目标：

- Build deterministic store profile, restaurant segment, and first metric snapshots for independent cafés.

交付物：

1. Schemas/models for store profile snapshots, menu/order/time-period/RFM snapshots, merchant confirmations, and restaurant_segments.
2. Metric definitions for the first independent-café themes: repurchase, add-on/combo, daypart, menu funnel, channel conversion, guardrail basics.
3. Snapshot worker or pure functions over fixtures.
4. Tests proving numerator/denominator/window definitions for selected metrics.

Verification target:

1. Unit tests for at least three core metrics.
2. Fixture-based segment candidate generation.
3. `git diff --check`.

done_when:

1. A segment candidate carries label, confidence, evidence_refs, and confirmation status.
2. Metrics define numerator, denominator, window, owner/source, and guardrail relation.
3. Independent-café focus is preserved; no full-restaurant generic sprawl.
4. LLM is not required to compute segment facts.

stop_boundary:

1. Stop if segment generation starts relying on LLM-only classification.
2. Stop if metrics cannot cite deterministic projection inputs.
3. Stop if full BI dashboard scope appears.

必须避免：

1. Do not mix all餐饮 categories into one benchmark pool.
2. Do not store inferred merchant preferences as permanent without evidence/confirmation.

#### `DD-P2-S1` — peer benchmark and opportunity gap engine

- Owner: `execute-plan`
- State: `queued`
- Priority: `high`

目标：

- Turn metrics and segments into peer benchmarks and opportunity gaps that can feed experiment generation.

交付物：

1. Schemas/models for peer_groups, peer_benchmarks, and opportunity_gaps.
2. Deterministic gap scoring using store value, peer median/p75/percentile, sample thresholds, and confidence.
3. Privacy/aggregation boundary notes for peer benchmark readiness.
4. Tests/fixtures showing one store produces ranked gaps.

Verification target:

1. Fixture test for benchmark and opportunity gap generation.
2. Validation that small samples are flagged weak/insufficient.
3. `git diff --check`.

done_when:

1. Opportunity gap output can answer “where does this store lag similar independent cafés?”.
2. Each gap references segment, metric, window, peer group, confidence, and evidence_refs.
3. Cross-store benchmark has threshold/de-identification assumptions documented.
4. No action is selected directly by hard-coded Action Registry ranking.

stop_boundary:

1. Stop if peer data would expose individual merchant/customer data.
2. Stop if missing peer sample thresholds would make benchmark misleading.
3. Stop before generating business experiments without validator boundary.

必须避免：

1. Do not convert gaps into infinite hard-coded action_type rules.
2. Do not claim causal certainty from peer comparison.

#### `DD-P3-S1` — Pi Agent sidecar runtime foundation

- Owner: `execute-plan`
- State: `queued`
- Priority: `high`

目标：

- Add a controlled `data-dyna-agent` sidecar foundation using Pi Agent SDK embedding first, with run/session audit and Core read boundary.

交付物：

1. Agent runtime package/app skeleton wrapping Pi Agent SDK or an explicit local adapter boundary if SDK import is unavailable.
2. `agent_runs` / `agent_run_events` schema or equivalent audit model.
3. Context bundle contract separating facts, assumptions, allowed actions, disallowed actions, and evidence_refs.
4. Documentation for SDK-first and RPC-later deployment choice.

Verification target:

1. Unit/contract test for context bundle serialization.
2. Agent run audit fixture can record model/session/tool event metadata without writing facts.
3. `git diff --check`.

done_when:

1. Agent sidecar can be invoked with a fixture context and returns a captured draft/run record or test double.
2. Agent cannot write orders, metrics, benchmarks, evidence facts, or business configs.
3. Session/run identity maps store_id + opportunity_gap_id + agent_run_id.
4. Runtime notes preserve Pi SDK first and RPC isolation later.

stop_boundary:

1. Stop if Pi SDK API is unavailable or incompatible and no thin adapter can preserve boundary.
2. Stop if agent tooling needs real LLM credentials to validate local contracts.
3. Stop if Agent output is treated as truth.

必须避免：

1. Do not build a new generic agent framework.
2. Do not add execution tools for menu/price/coupon mutation.

#### `DD-P3-S2` — agent tools, prompts, skills, and deterministic validator

- Owner: `execute-plan`
- State: `queued`
- Priority: `high`

目标：

- Maximize Pi Agent features while keeping tools high-level and safe: extensions, skills, prompt templates, structured output, and validator gates.

交付物：

1. Project-local Pi extension/tool package or documented package boundary.
2. High-level read/draft/validate/submit-review tools only.
3. Project skill/prompt templates for experiment generation and outcome review.
4. Zod schema for intervention_hypothesis and experiment_plan.
5. Deterministic validator result model.

Verification target:

1. Tool schema tests for allowed tools and denied execution-like tools.
2. Structured output validation tests for valid/invalid experiment plans.
3. Validator tests for requires_confirmation, rollback_supported, guardrails, sample size, and missing evidence.
4. `git diff --check`.

done_when:

1. Agent can draft an experiment_plan from fixture gap/context and validator can accept/block/needs_more_data deterministically.
2. Tools remain generic: get context, get benchmark, get similar trajectories, draft plan, validate plan, submit for review.
3. Prompt/skill files instruct Agent to generate hypotheses, not facts or direct actions.
4. Extension/tool policy blocks direct business mutation.

stop_boundary:

1. Stop if requested tool would directly apply menu, price, coupon, or customer messaging changes.
2. Stop if output lacks evidence_refs or uncertainty/confidence fields.
3. Stop if validator rules are delegated to LLM judgment.

必须避免：

1. Do not create infinite concrete business action tools.
2. Do not bypass merchant confirmation.

#### `DD-P4-S1` — merchant review, adoption, and action lifecycle contracts

- Owner: `execute-plan`
- State: `queued`
- Priority: `medium`

目标：

- Expose review/adoption contracts that let `mobile-hq` show evidence, accept/modify/reject plans, and record action lifecycle without direct external repo edits in this slice.

交付物：

1. API/schema for experiment plan review, merchant acceptance events, rejection reasons, applied/reverted records, and preference confirmation.
2. Event names aligned with `mobile-hq` host/remote roadmap.
3. Action lifecycle state machine: suggested/drafted/accepted/rejected/applied/measured/kept/reverted/extended/retest_needed.
4. Contract docs for later `mobile-hq` bridge integration.

Verification target:

1. API/schema tests for accept, reject, modify, apply, revert, and review-viewed events.
2. State transition tests rejecting invalid lifecycle jumps.
3. `git diff --check`.

done_when:

1. A merchant review flow can be simulated from agent draft -> validator -> review submitted -> accepted/rejected event.
2. Rejection reason can update candidate preference only with explicit confirmation semantics.
3. No external frontend repo change is required to validate the server-side contract.
4. PostHog sink remains optional product analytics mirror.

stop_boundary:

1. Stop before editing `mobile-hq` repos unless a new explicit cross-repo workset exists.
2. Stop if apply/revert tries to call real business mutation services without confirmation/rollback contract.
3. Stop if merchant adoption events become product analytics only and skip Core persistence.

必须避免：

1. Do not make `mobile-hq` remotes invent event names independently.
2. Do not silently convert rejection text into permanent preference.

#### `DD-P5-S1` — effect review, guardrail measurement, and Evidence Store

- Owner: `execute-plan`
- State: `queued`
- Priority: `medium`

目标：

- Close the evidence loop by measuring before/after outcomes, guardrails, merchant adoption, and intervention trajectories.

交付物：

1. Schemas/models for action_effects, guardrail_results, intervention_trajectories, and evidence_records.
2. Measurement worker/pure functions for before/after windows and confidence labels.
3. Guardrail checks for refund/cancel/AOV/discount cost/signature item/wait time when available.
4. Evidence record generation around the six-tuple and intervention trajectory.

Verification target:

1. Fixture test for an accepted/applied plan producing effect and guardrail result.
2. Evidence record test requiring segment + gap/problem + intervention + outcome + guardrail + adoption.
3. `git diff --check`.

done_when:

1. The system can answer “did yesterday/last period's experiment work?” from deterministic records.
2. Weak sample/small data cases are labeled weak or needs_more_data.
3. Main metric improvement with guardrail degradation is not recorded as clean success.
4. Evidence records are reproducible from stored facts and references.

stop_boundary:

1. Stop if causality claims exceed available before/after evidence.
2. Stop if guardrail data is missing and the plan tries to hide uncertainty.
3. Stop if evidence record depends on LLM-generated claims.

必须避免：

1. Do not overclaim statistical significance.
2. Do not drop merchant adoption from evidence.

#### `DD-CLOSEOUT-S1` — readiness audit and next-plane handoff

- Owner: `execution-reality-audit`
- State: `queued`
- Priority: `medium`

目标：

- Audit whether the implementation satisfies the SSOT docs, update plan status, and prepare next cross-repo or production-readiness workstream.

交付物：

1. Reality audit comparing docs, code, tests, contracts, and plan status.
2. Residual list split by Core, Agent, external integrations, data governance, and production ops.
3. Updated `docs/plan/*` terminal or next-pack handoff state.
4. Recommendation for next plan: external producer SDK integration, production hardening, or pilot merchant validation.

Verification target:

1. `plan_sync docs/plan` or equivalent plan parse check.
2. `git diff --check`.
3. Available project test/typecheck/build commands.

done_when:

1. README/PLAN/STATUS/WORKSET agree on terminal state or next active pack.
2. All completed slices have evidence or residuals.
3. No hidden external repo work is claimed complete.
4. Closeout routes to repo-local closeout prompt surface if full objective is done.

stop_boundary:

1. Stop if any accepted stage lacks proof and cannot be audited.
2. Stop if next work requires cross-repo ownership not yet planned.
3. Stop if production secrets, live merchant data, or governance approvals are needed.

必须避免：

1. Do not mark full objective done while residual implementation or review gaps remain.
2. Do not create a second control-plane root.

## Exit Criteria

- All active and queued slices carry concrete `done_when` / `stop_boundary`.
- `docs/plan/README.md`, this PLAN, STATUS, and WORKSET agree on active slice and handoff.
- Review handoff remains explicit: `execute` -> `review`; accepted review advances exactly one next slice.
- Full objective closeout uses the repo-local closeout prompt surface.
