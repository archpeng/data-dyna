# Data Dyna Agent Sidecar v1

`DD-P3-S1` adds only the runtime foundation for `data-dyna-agent`. It does not make Agent output a Data Core fact and it does not execute merchant/business mutations.

## Boundary

Data Core owns deterministic facts:

- raw events
- projections
- independent-café snapshots
- peer benchmarks
- opportunity gaps
- future evidence facts

The Agent sidecar may read a bounded `AgentContextBundle` and return an `intervention_hypothesis_draft`. The draft is captured in `agent_runs` for audit and review, with `truthStatus = agent_draft_not_core_truth` and `requestedCoreWrites = []`.

## Context bundle

`src/agent/context-bundle.ts` defines `agent-context-bundle.v1`:

- identity: `agentRunId`, `sessionId`, `brandId`, `storeId`, `opportunityGapId`
- facts: accepted deterministic `OpportunityGap` fields and `evidenceRefs`
- assumptions: e.g. peer comparison is directional and non-causal
- allowed draft operations: inspect context/benchmark/gap, draft hypothesis, draft experiment plan, submit for merchant review
- disallowed mutation targets: `orders`, `metrics`, `benchmarks`, `evidence_facts`, `business_configs`, `menu`, `price`, `coupon`, `customer_message_execution`

The session/run identity therefore maps:

```text
store_id + opportunity_gap_id + agent_run_id
```

## Runtime model

`src/agent/agent-sidecar.ts` defines an `AgentRuntimeAdapter` boundary:

- `runtimeMode = pi_sdk_adapter` is the intended production embedding path.
- `runtimeMode = fixture_adapter` is the local validation path and requires no model credentials.

The adapter can later wrap Pi SDK calls such as `createAgentSession()` with in-memory or persistent `SessionManager` instances. The sidecar function records lifecycle events before and after adapter invocation, so runtime/provider/model/thinking metadata are auditable even when the adapter is a fixture.

## SDK first, RPC later

Preferred first deployment is a Node/TypeScript sidecar that embeds Pi SDK directly because the repo is already TypeScript and Pi SDK supports programmatic sessions. RPC is reserved for later isolation or non-Node callers:

```text
Data Core API / worker
  -> AgentContextBundle
  -> data-dyna-agent sidecar
  -> Pi SDK AgentRuntimeAdapter
  -> captured AgentRun + AgentRunEvent audit
  -> merchant review / validator in later slices
```

Later RPC isolation can keep the same `AgentRuntimeAdapter` shape while moving Pi into `pi --mode rpc` behind a process boundary.

## Audit schema

`migrations/0005_agent_runs.sql` creates:

- `agent_runs`: one row per sidecar invocation, with provider/model/thinking/runtime metadata, context hash, draft JSON, and evidence refs
- `agent_run_events`: append-only run lifecycle events (`run_started`, `context_loaded`, `adapter_invoked`, `draft_captured`, `run_failed`)

SQL checks keep captured drafts from becoming Core truth by requiring:

- `context_bundle_version = 'agent-context-bundle.v1'`
- `draft->>'truthStatus' = 'agent_draft_not_core_truth'`
- `requestedCoreWrites` length is zero

## Local validation

The fixture adapter proves the sidecar can run locally without real LLM credentials. Tests validate:

- context bundle serialization
- fixture invocation
- run/event audit capture
- `storeId + opportunityGapId + agentRunId` identity mapping
- no Core writes and no menu/price/coupon mutation tool surface

DD-P3-S2 may add richer tools/prompts/skills and deterministic validator gates, but this foundation intentionally stops before direct business mutation or evidence-fact writes.
