import {
  AgentRunEventSchema,
  AgentRunSchema,
  type AgentRun,
  type AgentRunEvent,
  type AgentRunEventType,
  type AgentRuntimeUsage,
} from "./agent-sidecar.ts";

export type AgentRuntimeDeletionProof = {
  removedSurfaces: Array<{
    surface: string;
    productionMatches: number;
    testMatches: number;
    status: "removed_from_production";
  }>;
  residuals: string[];
};

export type AgentRuntimeObservabilityReport = {
  service: "data-dyna";
  runtimeEnvironment: "local_test";
  reportKind: "agent_runtime_observability.v1";
  auditEvents: Record<string, number>;
  auditCoverage: {
    preparedAttempt: boolean;
    policyEvaluation: boolean;
    runtimeSelection: boolean;
    harnessInvocation: boolean;
    toolCalls: boolean;
    toolDenials: boolean;
    sanitizedToolResults: boolean;
    draftCapture: boolean;
    validatorOutcome: boolean;
    reviewHandoffRequest: boolean;
    providerOrRuntimeFailure: boolean;
  };
  metricCounters: {
    runsStarted: number;
    runsDraftCaptured: number;
    runsFailed: number;
    toolCallsAttempted: number;
    toolCallsDenied: number;
    toolResultsSanitized: number;
    validationAccepted: number;
    validationBlocked: number;
    reviewRequests: number;
    durationObservations: number;
  };
  latency: {
    available: boolean;
    latencyMs: number;
  };
  runtimeUsage: ({ available: false } | ({ available: true } & AgentRuntimeUsage));
  deletionProof?: AgentRuntimeDeletionProof;
  residuals: string[];
};

const maxReportBytes = 8192;

export function buildAgentRuntimeObservabilityReport(input: {
  run: AgentRun;
  events: AgentRunEvent[];
  deletionProof?: AgentRuntimeDeletionProof;
}): AgentRuntimeObservabilityReport {
  const run = AgentRunSchema.parse(input.run);
  const events = input.events.map((event) => AgentRunEventSchema.parse(event));
  const auditEvents = countBy(events.map((event) => event.eventType));
  const validationDecisions = events
    .filter((event) => event.eventType === "draft_validation_evaluated")
    .map((event) => event.metadata.decision);
  const latencyMs = run.completedAt ? elapsedMs(run.startedAt, run.completedAt) : 0;

  const report: AgentRuntimeObservabilityReport = {
    service: "data-dyna",
    runtimeEnvironment: "local_test",
    reportKind: "agent_runtime_observability.v1",
    auditEvents,
    auditCoverage: {
      preparedAttempt: has(events, "attempt_loaded"),
      policyEvaluation: has(events, "policy_evaluated"),
      runtimeSelection: has(events, "runtime_selected"),
      harnessInvocation: has(events, "harness_invoked"),
      toolCalls: has(events, "tool_call_attempt"),
      toolDenials: has(events, "tool_call_denied"),
      sanitizedToolResults: has(events, "tool_result_sanitized"),
      draftCapture: has(events, "draft_captured"),
      validatorOutcome: has(events, "draft_validation_evaluated"),
      reviewHandoffRequest: has(events, "merchant_review_requested"),
      providerOrRuntimeFailure: has(events, "run_failed"),
    },
    metricCounters: {
      runsStarted: auditEvents.run_started ?? 0,
      runsDraftCaptured: auditEvents.draft_captured ?? 0,
      runsFailed: auditEvents.run_failed ?? 0,
      toolCallsAttempted: auditEvents.tool_call_attempt ?? 0,
      toolCallsDenied: auditEvents.tool_call_denied ?? 0,
      toolResultsSanitized: auditEvents.tool_result_sanitized ?? 0,
      validationAccepted: validationDecisions.filter((decision) => decision === "accept").length,
      validationBlocked: validationDecisions.filter((decision) => decision === "block").length,
      reviewRequests: auditEvents.merchant_review_requested ?? 0,
      durationObservations: run.completedAt ? 1 : 0,
    },
    latency: {
      available: Boolean(run.completedAt),
      latencyMs,
    },
    runtimeUsage: run.runtimeUsage ? { available: true, ...run.runtimeUsage } : { available: false },
    deletionProof: input.deletionProof,
    residuals: [
      "production dashboards/SLOs/paging/incident management remain residual",
      "cloud secret deployment hardening remains residual",
      "probe uses local/test selected runtimes and in-memory audit only",
    ],
  };

  assertAgentObservabilitySafe(report);
  return report;
}

export function assertAgentObservabilitySafe(value: unknown): void {
  const encoded = JSON.stringify(value);
  if (Buffer.byteLength(encoded, "utf8") > maxReportBytes) {
    throw new Error("Agent observability report exceeded the bounded local/test byte budget.");
  }
  assertNoAgentObservabilityLeak(encoded);
}

export function assertNoAgentObservabilityLeak(output: string): void {
  const forbidden = /bearer\s+\S+|authorization:|password=|secret=\S+|token=\S+|credential=\S+|database_url|sk-[A-Za-z0-9_-]+|BEGIN RSA PRIVATE KEY|raw[-_ ]?payload|4111111111111111|customerPhone=|paymentId=/i;
  if (forbidden.test(output)) {
    throw new Error("Agent observability output leaked a forbidden secret, raw payload, or customer/payment identifier.");
  }
}

function has(events: AgentRunEvent[], eventType: AgentRunEventType): boolean {
  return events.some((event) => event.eventType === eventType);
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function elapsedMs(startedAt: string, completedAt: string): number {
  const started = Date.parse(startedAt);
  const completed = Date.parse(completedAt);
  if (!Number.isFinite(started) || !Number.isFinite(completed) || completed < started) {
    return 0;
  }
  return completed - started;
}
