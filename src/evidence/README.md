# evidence

## Owns
- Before/after action effects, guardrail results, intervention trajectories, and evidence records.

## Inputs
- Experiment plans, metric snapshots, merchant acceptance, applied lifecycle records, action effects, and guardrail results.

## Outputs
- Directional before/after evidence, guardrail outcomes, trajectory verdicts, and reproducible evidence records.

## Allowed imports
- Agent experiment-plan types, benchmark opportunity-gap types, merchant-review lifecycle types, and snapshot metric types.

## Forbidden
- Do not treat evidence as causal proof; current interpretation is directional before/after and non-causal.
- Do not accept LLM-generated claims as evidence facts.
- Do not assemble trajectories without merchant adoption refs and applied lifecycle evidence.

## Validation
- Run `npm run test:evidence` and `npm run typecheck`; manually inspect verdict/evidence safety.
