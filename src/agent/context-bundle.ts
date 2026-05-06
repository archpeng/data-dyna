import { z } from "zod";
import {
  GapComparisonBasisSchema,
  GapDirectionSchema,
  BenchmarkInterpretationSchema,
  PeerSampleStatusSchema,
  type OpportunityGap,
} from "../benchmarks/opportunity-gaps.ts";
import { GuardrailRelationSchema, SnapshotMetricIdSchema } from "../snapshots/independent-cafe-snapshots.ts";

export const AgentContextBundleVersionSchema = z.literal("agent-context-bundle.v1");
export const AgentAllowedDraftOperationSchema = z.enum([
  "inspect_store_context",
  "inspect_peer_benchmark",
  "inspect_opportunity_gap",
  "draft_intervention_hypothesis",
  "draft_experiment_plan",
  "request_merchant_review_gate",
]);
export const DisallowedAgentMutationTargetSchema = z.enum([
  "orders",
  "metrics",
  "benchmarks",
  "evidence_facts",
  "business_configs",
  "menu",
  "price",
  "coupon",
  "customer_message_execution",
]);

export type AgentContextBundleVersion = z.infer<typeof AgentContextBundleVersionSchema>;
export type AgentAllowedDraftOperation = z.infer<typeof AgentAllowedDraftOperationSchema>;
export type DisallowedAgentMutationTarget = z.infer<typeof DisallowedAgentMutationTargetSchema>;

export const CORE_WRITE_DISALLOWED_TARGETS: DisallowedAgentMutationTarget[] = [
  "orders",
  "metrics",
  "benchmarks",
  "evidence_facts",
  "business_configs",
];

export const BUSINESS_MUTATION_DISALLOWED_TARGETS: DisallowedAgentMutationTarget[] = [
  "menu",
  "price",
  "coupon",
  "customer_message_execution",
];

export const DEFAULT_ALLOWED_DRAFT_OPERATIONS: AgentAllowedDraftOperation[] = [
  "inspect_store_context",
  "inspect_peer_benchmark",
  "inspect_opportunity_gap",
  "draft_intervention_hypothesis",
  "draft_experiment_plan",
  "request_merchant_review_gate",
];

export const AgentOpportunityGapFactSchema = z.object({
  opportunityGapId: z.string().min(1),
  brandId: z.string().min(1),
  storeId: z.string().min(1),
  snapshotDate: z.string().min(1),
  segmentCandidateId: z.string().min(1),
  segmentLabel: z.literal("independent_cafe_core"),
  metricId: SnapshotMetricIdSchema,
  metricWindow: z.enum(["snapshot", "90d"]),
  guardrailRelation: GuardrailRelationSchema,
  targetValue: z.number(),
  peerMedianValue: z.number().nullable(),
  peerP75Value: z.number().nullable(),
  comparisonBasis: GapComparisonBasisSchema,
  direction: GapDirectionSchema,
  gapValue: z.number().nonnegative(),
  gapRatio: z.number().nonnegative().nullable(),
  rank: z.number().int().positive().nullable(),
  confidence: z.number().min(0).max(1),
  sampleStatus: PeerSampleStatusSchema,
  interpretation: BenchmarkInterpretationSchema,
  evidenceRefs: z.array(z.string().min(1)).min(1),
});

export const AgentContextBundleSchema = z
  .object({
    contractVersion: AgentContextBundleVersionSchema,
    agentRunId: z.string().min(1),
    sessionId: z.string().min(1),
    brandId: z.string().min(1),
    storeId: z.string().min(1),
    opportunityGapId: z.string().min(1),
    createdAt: z.string().min(1),
    facts: z.object({
      opportunityGap: AgentOpportunityGapFactSchema,
      evidenceRefs: z.array(z.string().min(1)).min(1),
    }),
    assumptions: z.array(z.string().min(1)),
    allowedDraftOperations: z.array(AgentAllowedDraftOperationSchema).min(1),
    disallowedMutationTargets: z.array(DisallowedAgentMutationTargetSchema).min(1),
    evidenceRefs: z.array(z.string().min(1)).min(1),
  })
  .superRefine((bundle, ctx) => {
    const gap = bundle.facts.opportunityGap;
    if (bundle.brandId !== gap.brandId) {
      ctx.addIssue({ code: "custom", path: ["brandId"], message: "brandId must match facts.opportunityGap.brandId" });
    }
    if (bundle.storeId !== gap.storeId) {
      ctx.addIssue({ code: "custom", path: ["storeId"], message: "storeId must match facts.opportunityGap.storeId" });
    }
    if (bundle.opportunityGapId !== gap.opportunityGapId) {
      ctx.addIssue({ code: "custom", path: ["opportunityGapId"], message: "opportunityGapId must match facts.opportunityGap.opportunityGapId" });
    }

    const requiredDisallowedTargets = [...CORE_WRITE_DISALLOWED_TARGETS, ...BUSINESS_MUTATION_DISALLOWED_TARGETS];
    for (const target of requiredDisallowedTargets) {
      if (!bundle.disallowedMutationTargets.includes(target)) {
        ctx.addIssue({ code: "custom", path: ["disallowedMutationTargets"], message: `missing required disallowed mutation target: ${target}` });
      }
    }

    const factEvidenceRefs = uniqueSorted(gap.evidenceRefs);
    const bundleEvidenceRefs = uniqueSorted(bundle.evidenceRefs);
    const nestedEvidenceRefs = uniqueSorted(bundle.facts.evidenceRefs);
    if (!sameStrings(bundleEvidenceRefs, factEvidenceRefs) || !sameStrings(nestedEvidenceRefs, factEvidenceRefs)) {
      ctx.addIssue({ code: "custom", path: ["evidenceRefs"], message: "bundle evidenceRefs must match opportunity gap evidenceRefs" });
    }
  });

export type AgentOpportunityGapFact = z.infer<typeof AgentOpportunityGapFactSchema>;
export type AgentContextBundle = z.infer<typeof AgentContextBundleSchema>;

export function buildAgentContextBundle(input: {
  agentRunId: string;
  sessionId: string;
  opportunityGap: OpportunityGap;
  createdAt: string;
  assumptions?: string[];
  allowedDraftOperations?: AgentAllowedDraftOperation[];
  disallowedMutationTargets?: DisallowedAgentMutationTarget[];
}): AgentContextBundle {
  const disallowedMutationTargets = uniqueSorted([
    ...(input.disallowedMutationTargets ?? []),
    ...CORE_WRITE_DISALLOWED_TARGETS,
    ...BUSINESS_MUTATION_DISALLOWED_TARGETS,
  ]) as DisallowedAgentMutationTarget[];
  const evidenceRefs = uniqueSorted(input.opportunityGap.evidenceRefs);

  return AgentContextBundleSchema.parse({
    contractVersion: "agent-context-bundle.v1",
    agentRunId: input.agentRunId,
    sessionId: input.sessionId,
    brandId: input.opportunityGap.brandId,
    storeId: input.opportunityGap.storeId,
    opportunityGapId: input.opportunityGap.opportunityGapId,
    createdAt: input.createdAt,
    facts: {
      opportunityGap: input.opportunityGap,
      evidenceRefs,
    },
    assumptions: input.assumptions ?? ["Peer benchmark comparison is directional and non-causal."],
    allowedDraftOperations: input.allowedDraftOperations ?? DEFAULT_ALLOWED_DRAFT_OPERATIONS,
    disallowedMutationTargets,
    evidenceRefs,
  });
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort(compareStrings);
}

function sameStrings(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right);
}
