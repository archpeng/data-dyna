import { z } from "zod";

export const AgentToolNameSchema = z.enum([
  "get_store_context",
  "get_peer_benchmark",
  "get_opportunity_gaps",
  "get_similar_trajectories",
  "draft_experiment_plan",
  "validate_experiment_plan",
  "submit_for_merchant_review",
]);

export const AgentToolCapabilitySchema = z.enum(["read_context", "draft", "validate", "submit_review"]);
export const AgentToolMutationPolicySchema = z.literal("no_core_or_business_mutation");

export const AgentToolDescriptorSchema = z.object({
  name: AgentToolNameSchema,
  capability: AgentToolCapabilitySchema,
  mutationPolicy: AgentToolMutationPolicySchema,
  description: z.string().min(1),
});

export const AgentToolPolicyResultSchema = z.object({
  allowed: z.boolean(),
  deniedToolNames: z.array(z.string()),
  reasons: z.array(z.string()),
});

export type AgentToolName = z.infer<typeof AgentToolNameSchema>;
export type AgentToolCapability = z.infer<typeof AgentToolCapabilitySchema>;
export type AgentToolDescriptor = z.infer<typeof AgentToolDescriptorSchema>;
export type AgentToolPolicyResult = z.infer<typeof AgentToolPolicyResultSchema>;

export const SAFE_AGENT_TOOL_NAMES: AgentToolName[] = [
  "get_store_context",
  "get_peer_benchmark",
  "get_opportunity_gaps",
  "get_similar_trajectories",
  "draft_experiment_plan",
  "validate_experiment_plan",
  "submit_for_merchant_review",
];

export const DEFAULT_AGENT_TOOL_DESCRIPTORS: AgentToolDescriptor[] = [
  {
    name: "get_store_context",
    capability: "read_context",
    mutationPolicy: "no_core_or_business_mutation",
    description: "Read deterministic store context for one agent run.",
  },
  {
    name: "get_peer_benchmark",
    capability: "read_context",
    mutationPolicy: "no_core_or_business_mutation",
    description: "Read aggregate-only peer benchmark facts.",
  },
  {
    name: "get_opportunity_gaps",
    capability: "read_context",
    mutationPolicy: "no_core_or_business_mutation",
    description: "Read deterministic opportunity gaps for hypothesis generation.",
  },
  {
    name: "get_similar_trajectories",
    capability: "read_context",
    mutationPolicy: "no_core_or_business_mutation",
    description: "Read de-identified historical trajectory summaries when available.",
  },
  {
    name: "draft_experiment_plan",
    capability: "draft",
    mutationPolicy: "no_core_or_business_mutation",
    description: "Draft an experiment plan for deterministic validation and merchant review.",
  },
  {
    name: "validate_experiment_plan",
    capability: "validate",
    mutationPolicy: "no_core_or_business_mutation",
    description: "Run deterministic validator checks over a drafted experiment plan.",
  },
  {
    name: "submit_for_merchant_review",
    capability: "submit_review",
    mutationPolicy: "no_core_or_business_mutation",
    description: "Submit a validated draft to merchant review without applying business changes.",
  },
];

const DIRECT_MUTATION_VERBS = ["write", "update", "mutate", "execute", "apply", "send", "set"];
const DIRECT_MUTATION_TARGETS = ["menu", "price", "coupon", "customer_message", "message", "order", "metric", "benchmark", "evidence", "config"];

export function evaluateAgentToolPolicy(tools: Array<{ name: string; mutationPolicy?: string }>): AgentToolPolicyResult {
  const deniedToolNames: string[] = [];
  const reasons: string[] = [];
  const safeNames = new Set<string>(SAFE_AGENT_TOOL_NAMES);

  for (const tool of tools) {
    const name = tool.name;
    const lowerName = name.toLowerCase();
    if (!safeNames.has(name)) {
      deniedToolNames.push(name);
      reasons.push(`tool is not in the safe high-level allowlist: ${name}`);
      continue;
    }
    if (tool.mutationPolicy !== "no_core_or_business_mutation") {
      deniedToolNames.push(name);
      reasons.push(`tool must declare no_core_or_business_mutation policy: ${name}`);
      continue;
    }
    if (looksLikeDirectMutation(lowerName)) {
      deniedToolNames.push(name);
      reasons.push(`tool name looks like a direct business/Core mutation: ${name}`);
    }
  }

  return AgentToolPolicyResultSchema.parse({
    allowed: deniedToolNames.length === 0,
    deniedToolNames,
    reasons,
  });
}

export function assertAgentToolPolicy(tools: Array<{ name: string; mutationPolicy?: string }>): void {
  const result = evaluateAgentToolPolicy(tools);
  if (!result.allowed) {
    throw new Error(result.reasons.join("; "));
  }
}

function looksLikeDirectMutation(name: string): boolean {
  return DIRECT_MUTATION_VERBS.some((verb) => name.includes(verb)) && DIRECT_MUTATION_TARGETS.some((target) => name.includes(target));
}
