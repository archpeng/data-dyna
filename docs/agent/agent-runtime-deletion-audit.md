# Data Dyna Agent Runtime Deletion Audit

Status: `DD-P6-S6` deletion-proof artifact for removed compatibility, fallback, and server-managed flow surfaces.

## Rule

P6 uses one selected boundary:

```ts
runAgentAttempt({ preparedAttempt, prompt, tools, policy, runtime, audit })
```

When a P6 slice supersedes an older surface, the old surface must be deleted from production Agent code rather than wrapped for compatibility. Local/test doubles may exist only under `tests/**` or probe scripts as selected runtimes; they are not production fallback paths.

## Removed surfaces

| Removed surface | Risk | Owning evidence | Current proof |
|---|---|---|---|
| `adapter.draft(context)` | server-owned static draft runtime | `DD-P6-S3` | removed from `src/agent/agent-sidecar.ts`; probe scans production Agent sources |
| `AgentRuntimeAdapter` | legacy adapter abstraction/dual stack | `DD-P6-S3` | removed from production Agent sources |
| `createFixtureAgentRuntimeAdapter` | fixture fallback path | `DD-P6-S3` / `DD-P6-S6` | removed from production Agent sources; selected local/test runtimes are explicit test/probe objects |
| `fixture_adapter` runtime mode | fallback runtime mode | `DD-P6-S3` | `AgentRuntimeModeSchema` accepts only `pi_sdk_adapter` or fail-closed `unselected` audit value |
| old safe-policy aliases (`get_store_context`, `get_peer_benchmark`, `get_opportunity_gaps`, `get_similar_trajectories`, `draft_experiment_plan`, `validate_experiment_plan`, `submit_for_merchant_review`) | old P3 tool compatibility and hidden business-flow affordance | `DD-P6-S4` | active safe policy exposes only P6 prepared read-only tool names |
| static fixture draft helper `draftFixtureExperimentPlanFromContext` | production-reachable server-managed draft helper | `DD-P6-S5` review repair | moved to `tests/support/experiment-plan-fixture.ts`; production `src/agent/experiment-plan.ts` contains schemas/types only |
| automatic draft -> validate -> submit pipeline | hidden server-managed business flow | `DD-P6-S5` | `runAgentAttempt` captures drafts only; `requestMerchantReviewForAgentDraft` is explicit and requires accepted deterministic validation |

## Machine proof

Run:

```bash
npx tsx scripts/probe-agent-runtime-observability.ts
```

The probe scans `src/agent/*.ts` for the production-forbidden strings:

1. `adapter.draft(`
2. `AgentRuntimeAdapter`
3. `createFixtureAgentRuntimeAdapter`
4. `fixture_adapter`
5. `draftFixtureExperimentPlanFromContext`
6. `submit_for_merchant_review`

Any production match fails the probe. Test matches are reported only as fixture/proof material.

## Residuals

1. Production provider credentials and deployment remain residual.
2. Production dashboard/SLO/paging/incident implementation remains residual.
3. Future changes that intentionally reintroduce a deleted surface require a new accepted plan and deletion-risk proof; do not add compatibility aliases ad hoc.
