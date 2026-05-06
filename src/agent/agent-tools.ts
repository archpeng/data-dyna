import { z } from "zod";

export const AgentToolNameSchema = z.enum([
  "read_worker_freshness",
  "read_projection_summary",
  "read_snapshot_summary",
  "read_benchmark_opportunity_gaps",
  "read_evidence_records",
  "read_dead_letter_diagnosis",
]);

export const AgentToolCapabilitySchema = z.literal("read_context");
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
  "read_worker_freshness",
  "read_projection_summary",
  "read_snapshot_summary",
  "read_benchmark_opportunity_gaps",
  "read_evidence_records",
  "read_dead_letter_diagnosis",
];

export const DEFAULT_AGENT_TOOL_DESCRIPTORS: AgentToolDescriptor[] = [
  {
    name: "read_worker_freshness",
    capability: "read_context",
    mutationPolicy: "no_core_or_business_mutation",
    description: "Read committed worker freshness refs for one prepared Agent attempt.",
  },
  {
    name: "read_projection_summary",
    capability: "read_context",
    mutationPolicy: "no_core_or_business_mutation",
    description: "Read bounded projection aggregate summaries from a prepared freshness ref.",
  },
  {
    name: "read_snapshot_summary",
    capability: "read_context",
    mutationPolicy: "no_core_or_business_mutation",
    description: "Read bounded snapshot aggregate summaries from a prepared freshness ref.",
  },
  {
    name: "read_benchmark_opportunity_gaps",
    capability: "read_context",
    mutationPolicy: "no_core_or_business_mutation",
    description: "Read aggregate-only benchmark opportunity gaps from a prepared freshness ref.",
  },
  {
    name: "read_evidence_records",
    capability: "read_context",
    mutationPolicy: "no_core_or_business_mutation",
    description: "Read deterministic evidence summaries without promoting LLM-authored facts.",
  },
  {
    name: "read_dead_letter_diagnosis",
    capability: "read_context",
    mutationPolicy: "no_core_or_business_mutation",
    description: "Read redacted dead-letter diagnosis for a blocked prepared attempt.",
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
