#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const rootFlagIndex = process.argv.indexOf("--root");
const repoRoot = rootFlagIndex >= 0 ? path.resolve(process.argv[rootFlagIndex + 1] ?? "") : path.resolve(import.meta.dirname, "..");

if (rootFlagIndex >= 0 && !process.argv[rootFlagIndex + 1]) {
  console.error("Missing value for --root");
  process.exit(2);
}

const checks = [
  {
    id: "event-contract-version-source",
    path: "src/contracts/event-contract.ts",
    description: "event-contract.v1 remains the event schema contract literal.",
    matches: (text) => /EventContractVersionSchema\s*=\s*z\.literal\(\s*["']event-contract\.v1["']\s*\)/.test(text),
  },
  {
    id: "agent-context-bundle-version-source",
    path: "src/agent/context-bundle.ts",
    description: "agent-context-bundle.v1 remains the Agent context bundle contract literal.",
    matches: (text) => /AgentContextBundleVersionSchema\s*=\s*z\.literal\(\s*["']agent-context-bundle\.v1["']\s*\)/.test(text),
  },
  {
    id: "agent-context-bundle-version-migration",
    path: "migrations/0005_agent_runs.sql",
    description: "agent_runs persists only agent-context-bundle.v1 context bundles.",
    matches: (text) => /context_bundle_version\s+TEXT\s+NOT\s+NULL\s+CHECK\s*\(\s*context_bundle_version\s*=\s*'agent-context-bundle\.v1'\s*\)/i.test(text),
  },
  {
    id: "merchant-review-version-source",
    path: "src/merchant-review/experiment-review.ts",
    description: "merchant-review.v1 remains the merchant review contract literal.",
    matches: (text) => /MerchantReviewContractVersionSchema\s*=\s*z\.literal\(\s*["']merchant-review\.v1["']\s*\)/.test(text),
  },
  {
    id: "evidence-store-version-source",
    path: "src/evidence/evidence-store.ts",
    description: "evidence-store.v1 remains the evidence store contract literal.",
    matches: (text) => /EvidenceStoreContractVersionSchema\s*=\s*z\.literal\(\s*["']evidence-store\.v1["']\s*\)/.test(text),
  },
  {
    id: "business-mutation-disabled-migration",
    path: "migrations/0006_merchant_review.sql",
    description: "merchant lifecycle records cannot call business mutations.",
    matches: (text) => /business_mutation_called\s+BOOLEAN\s+NOT\s+NULL\s+DEFAULT\s+FALSE\s+CHECK\s*\(\s*business_mutation_called\s*=\s*FALSE\s*\)/i.test(text),
  },
  {
    id: "llm-generated-claims-empty-migration",
    path: "migrations/0007_evidence_store.sql",
    description: "evidence records keep llm_generated_claims pinned to an empty JSON array.",
    matches: (text) => /llm_generated_claims\s+JSONB\s+NOT\s+NULL\s+DEFAULT\s+'\[\]'::jsonb\s+CHECK\s*\(\s*llm_generated_claims\s*=\s*'\[\]'::jsonb\s*\)/i.test(text),
  },
  {
    id: "pos-final-fact-source-migration",
    path: "migrations/0002_business_projections.sql",
    description: "orders, payments, and refunds keep POS as the final fact source.",
    matches: (text) => [...text.matchAll(/final_fact_source\s+TEXT\s+NOT\s+NULL\s+CHECK\s*\(\s*final_fact_source\s*=\s*'pos'\s*\)/gi)].length >= 3,
  },
  {
    id: "pos-final-fact-source-source",
    path: "src/projections/business-projections.ts",
    description: "projection types and builders keep finalFactSource as pos.",
    matches: (text) => /finalFactSource:\s*["']pos["']/.test(text) && [...text.matchAll(/finalFactSource:\s*["']pos["']/g)].length >= 3,
  },
  {
    id: "datamesh-rfm-source-source",
    path: "src/datamesh/rfm-member-labels.ts",
    description: "Datamesh RFM adapter keeps report.crm.member_labels as its source table.",
    matches: (text) => /DATAMESH_MEMBER_LABELS_SOURCE_TABLE\s*=\s*["']report\.crm\.member_labels["']\s+as\s+const/.test(text),
  },
  {
    id: "datamesh-rfm-source-migration",
    path: "migrations/0002_business_projections.sql",
    description: "member_rfm_snapshots requires source_table = report.crm.member_labels.",
    matches: (text) => /source_table\s+TEXT\s+NOT\s+NULL\s+CHECK\s*\(\s*source_table\s*=\s*'report\.crm\.member_labels'\s*\)/i.test(text),
  },
  {
    id: "peer-deidentification-source",
    path: "src/benchmarks/opportunity-gaps.ts",
    description: "peer benchmark output remains aggregate-only with no peer store IDs.",
    matches: (text) => /deidentificationMethod:\s*["']aggregate_only_no_peer_store_ids["']/.test(text),
  },
  {
    id: "peer-deidentification-migration",
    path: "migrations/0004_peer_benchmarks.sql",
    description: "peer_groups requires aggregate-only deidentification.",
    matches: (text) => /deidentification_method\s+TEXT\s+NOT\s+NULL\s+CHECK\s*\(\s*deidentification_method\s*=\s*'aggregate_only_no_peer_store_ids'\s*\)/i.test(text),
  },
  {
    id: "peer-threshold-floor-source",
    path: "src/benchmarks/opportunity-gaps.ts",
    description: "peer benchmark code keeps the minimum peer store floor at 3.",
    matches: (text) => /DEFAULT_MIN_PEER_STORE_COUNT\s*=\s*3/.test(text) && /Math\.max\(\s*input\.minPeerStoreCount\s*\?\?\s*DEFAULT_MIN_PEER_STORE_COUNT\s*,\s*DEFAULT_MIN_PEER_STORE_COUNT\s*\)/.test(text),
  },
  {
    id: "peer-threshold-floor-migration",
    path: "migrations/0004_peer_benchmarks.sql",
    description: "peer benchmark tables keep min_peer_store_count >= 3 constraints.",
    matches: (text) => [...text.matchAll(/min_peer_store_count\s+INTEGER\s+NOT\s+NULL\s+CHECK\s*\(\s*min_peer_store_count\s*>=\s*3\s*\)/gi)].length >= 2,
  },
];

if (process.argv.includes("--list-checks")) {
  for (const check of checks) {
    console.log(`${check.id}: ${check.path} - ${check.description}`);
  }
  process.exit(0);
}

const failures = [];

for (const check of checks) {
  const absolutePath = path.join(repoRoot, check.path);
  if (!fs.existsSync(absolutePath)) {
    failures.push({ check, reason: "file missing" });
    continue;
  }

  const text = fs.readFileSync(absolutePath, "utf8");
  if (!check.matches(text)) {
    failures.push({ check, reason: "expected contract text or constraint missing" });
  }
}

if (failures.length > 0) {
  console.error("Schema / migration safety check failed:");
  for (const failure of failures) {
    console.error(`- ${failure.check.path} [${failure.check.id}] ${failure.reason}: ${failure.check.description}`);
  }
  process.exit(1);
}

console.log(`Schema / migration safety check passed: ${checks.length} contract checks.`);
