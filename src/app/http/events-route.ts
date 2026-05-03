import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import {
  authenticateIngestionRequest,
  type AuthenticatedIngestionCredential,
} from "../auth/ingestion-auth.ts";
import type { IngestionCredential, RuntimeEnvironment } from "../config/runtime-config.ts";
import {
  createRequestObservabilityContext,
  emitRuntimeLog,
  safeObservabilityId,
  type RequestObservabilityContext,
  type RuntimeLogInput,
  type RuntimeLogOutcome,
  type RuntimeLogSink,
} from "../observability/runtime-log.ts";
import {
  httpStatusClass,
  incrementRuntimeCounter,
  observeRuntimeDuration,
  type RuntimeMetricLabels,
  type RuntimeMetricSink,
} from "../observability/runtime-metrics.ts";
import {
  handlePostEvent,
  handlePostEventsBatch,
  type BatchIngestionResult,
  type EventIngestionResult,
  type IngestionDependencies,
  type InvalidEventResult,
} from "../../ingestion/event-handlers.ts";

export type EventsRouteOptions = IngestionDependencies & {
  ingestionCredentials: IngestionCredential[];
  runtimeEnvironment: RuntimeEnvironment;
  observabilityLogSink?: RuntimeLogSink;
  observabilityMetricSink?: RuntimeMetricSink;
};

type RouteLogContext = {
  route: "/events" | "/events/batch";
  method: string;
  startedAt: number;
  observability: RequestObservabilityContext;
};

export const registerEventsRoutes: FastifyPluginAsync<EventsRouteOptions> = async (app, dependencies) => {
  app.post("/events", async (request, reply) => {
    const logContext = buildRouteLogContext(request, "/events");
    const authorized = requireAuthorizedIngestion(request, reply, dependencies.ingestionCredentials);
    if (!authorized) {
      emitAuthRejected(dependencies, logContext);
      emitRequestCompleted(dependencies, logContext, 401, "unauthorized", "UNAUTHORIZED");
      return reply;
    }

    try {
      const result = await handlePostEvent(request.body, dependencies, authorized);
      emitIngestionResult(dependencies, logContext, result, authorized);
      emitRequestCompleted(
        dependencies,
        logContext,
        result.status,
        outcomeFromEventResult(result),
        errorCodeFromEventResult(result),
        credentialLogFields(authorized),
      );
      return reply.code(result.status).send(result);
    } catch (error) {
      emitRequestCompleted(dependencies, logContext, 500, "error", "unexpected_error", credentialLogFields(authorized));
      throw error;
    }
  });

  app.post("/events/batch", async (request, reply) => {
    const logContext = buildRouteLogContext(request, "/events/batch");
    const authorized = requireAuthorizedIngestion(request, reply, dependencies.ingestionCredentials);
    if (!authorized) {
      emitAuthRejected(dependencies, logContext);
      emitRequestCompleted(dependencies, logContext, 401, "unauthorized", "UNAUTHORIZED");
      return reply;
    }

    try {
      const result = await handlePostEventsBatch(request.body, dependencies, authorized);
      emitBatchIngestionResult(dependencies, logContext, result, authorized, request.body);
      emitRequestCompleted(
        dependencies,
        logContext,
        result.status,
        outcomeFromBatchResult(result),
        errorCodeFromBatchResult(result),
        {
          ...credentialLogFields(authorized),
          batch_size: Array.isArray(request.body) ? request.body.length : undefined,
        },
      );
      return reply.code(result.status).send(result);
    } catch (error) {
      emitRequestCompleted(dependencies, logContext, 500, "error", "unexpected_error", credentialLogFields(authorized));
      throw error;
    }
  });
};

function buildRouteLogContext(
  request: FastifyRequest,
  route: RouteLogContext["route"],
): RouteLogContext {
  return {
    route,
    method: request.method,
    startedAt: Date.now(),
    observability: createRequestObservabilityContext({
      "x-request-id": request.headers["x-request-id"],
      "x-correlation-id": request.headers["x-correlation-id"],
    }),
  };
}

function requireAuthorizedIngestion(
  request: FastifyRequest,
  reply: FastifyReply,
  ingestionCredentials: IngestionCredential[],
): AuthenticatedIngestionCredential | undefined {
  const auth = authenticateIngestionRequest(request.headers.authorization, ingestionCredentials);
  if (auth.ok) {
    return auth.credential;
  }

  reply.header("WWW-Authenticate", "Bearer").code(auth.response.status).send(auth.response);
  return undefined;
}

function emitAuthRejected(dependencies: EventsRouteOptions, logContext: RouteLogContext): void {
  emitRuntimeLog(dependencies.observabilityLogSink, dependencies.runtimeEnvironment, {
    level: "warn",
    event: "ingestion.auth.rejected",
    request_id: logContext.observability.requestId,
    correlation_id: logContext.observability.correlationId,
    route: logContext.route,
    method: logContext.method,
    status: 401,
    outcome: "unauthorized",
    error_code: "UNAUTHORIZED",
  });
  incrementRuntimeCounter(
    dependencies.observabilityMetricSink,
    dependencies.runtimeEnvironment,
    "data_dyna_ingestion_auth_rejections_total",
    {
      route: logContext.route,
      method: logContext.method,
      error_code: "UNAUTHORIZED",
    },
  );
}

function emitIngestionResult(
  dependencies: EventsRouteOptions,
  logContext: RouteLogContext,
  result: EventIngestionResult,
  credential: AuthenticatedIngestionCredential,
): void {
  emitIngestionEventMetric(dependencies, logContext, result, credential);

  if (result.ok) {
    emitRuntimeLog(dependencies.observabilityLogSink, dependencies.runtimeEnvironment, {
      level: "info",
      event: result.duplicate ? "ingestion.event.duplicate" : "ingestion.event.accepted",
      request_id: logContext.observability.requestId,
      correlation_id: eventCorrelationId(result, logContext),
      route: logContext.route,
      method: logContext.method,
      status: result.status,
      outcome: result.duplicate ? "duplicate" : "accepted",
      credential_id: result.persisted.credentialId ?? credential.credentialId,
      merchant_id: result.persisted.merchantId,
      store_id: result.persisted.storeId,
      source: result.persisted.source,
      producer_service: result.persisted.producerService,
      producer_environment: result.persisted.producerEnvironment,
      event_domain: result.persisted.domain,
      event_name: result.persisted.name,
    });
    return;
  }

  if ("error" in result) {
    emitRuntimeLog(dependencies.observabilityLogSink, dependencies.runtimeEnvironment, {
      level: "warn",
      event: "ingestion.event.tenant_policy_rejected",
      request_id: logContext.observability.requestId,
      correlation_id: logContext.observability.correlationId,
      route: logContext.route,
      method: logContext.method,
      status: result.status,
      outcome: outcomeFromTenantPolicyCode(result.error.code),
      error_code: result.error.code,
      credential_id: result.invalid.credentialId ?? credential.credentialId,
      merchant_id: result.invalid.merchantId,
      store_id: result.invalid.storeId,
      source: result.invalid.source,
      producer_service: result.invalid.producerService,
      producer_environment: result.invalid.producerEnvironment,
    });
    return;
  }

  emitInvalidEvent(dependencies, logContext, result, credential);
}

function emitInvalidEvent(
  dependencies: EventsRouteOptions,
  logContext: RouteLogContext,
  result: InvalidEventResult,
  credential: AuthenticatedIngestionCredential,
): void {
  emitRuntimeLog(dependencies.observabilityLogSink, dependencies.runtimeEnvironment, {
    level: "warn",
    event: "ingestion.event.invalid",
    request_id: logContext.observability.requestId,
    correlation_id: logContext.observability.correlationId,
    route: logContext.route,
    method: logContext.method,
    status: result.status,
    outcome: "invalid",
    error_code: "invalid_schema",
    ...credentialLogFields(credential),
  });
}

function emitBatchIngestionResult(
  dependencies: EventsRouteOptions,
  logContext: RouteLogContext,
  result: BatchIngestionResult | InvalidEventResult,
  credential: AuthenticatedIngestionCredential,
  payload: unknown,
): void {
  if (!("results" in result)) {
    emitInvalidEvent(dependencies, logContext, result, credential);
    emitBatchCompleted(dependencies, logContext, result.status, "invalid", "invalid_schema", payload, []);
    return;
  }

  for (const item of result.results) {
    emitIngestionResult(dependencies, logContext, item, credential);
    emitBatchItemMetric(dependencies, item, credential);
  }

  emitBatchCompleted(dependencies, logContext, result.status, outcomeFromBatchResult(result), undefined, payload, result.results);
}

function emitBatchCompleted(
  dependencies: EventsRouteOptions,
  logContext: RouteLogContext,
  status: number,
  outcome: RuntimeLogOutcome,
  errorCode: string | undefined,
  payload: unknown,
  results: EventIngestionResult[],
): void {
  const summary = summarizeBatchResults(results);
  emitRuntimeLog(dependencies.observabilityLogSink, dependencies.runtimeEnvironment, {
    level: status >= 500 ? "error" : "info",
    event: "ingestion.batch.completed",
    request_id: logContext.observability.requestId,
    correlation_id: logContext.observability.correlationId,
    route: logContext.route,
    method: logContext.method,
    status,
    outcome,
    error_code: errorCode,
    batch_size: Array.isArray(payload) ? payload.length : undefined,
    accepted_count: summary.accepted,
    duplicate_count: summary.duplicate,
    invalid_count: summary.invalid,
    tenant_policy_failure_count: summary.tenantPolicyFailure,
  });
}

function emitIngestionEventMetric(
  dependencies: EventsRouteOptions,
  logContext: RouteLogContext,
  result: EventIngestionResult,
  credential: AuthenticatedIngestionCredential,
): void {
  const labels = metricLabelsFromEventResult(logContext, result, credential);
  incrementRuntimeCounter(
    dependencies.observabilityMetricSink,
    dependencies.runtimeEnvironment,
    "data_dyna_ingestion_events_total",
    labels,
  );

  if (!result.ok && "error" in result) {
    incrementRuntimeCounter(
      dependencies.observabilityMetricSink,
      dependencies.runtimeEnvironment,
      "data_dyna_ingestion_tenant_policy_failures_total",
      {
        ...credentialMetricLabels(credential),
        error_code: result.error.code,
      },
    );
  }
}

function emitBatchItemMetric(
  dependencies: EventsRouteOptions,
  result: EventIngestionResult,
  credential: AuthenticatedIngestionCredential,
): void {
  const labels = metricLabelsFromEventResult(undefined, result, credential);
  incrementRuntimeCounter(
    dependencies.observabilityMetricSink,
    dependencies.runtimeEnvironment,
    "data_dyna_ingestion_batch_items_total",
    labels,
  );
}

function metricLabelsFromEventResult(
  logContext: RouteLogContext | undefined,
  result: EventIngestionResult,
  credential: AuthenticatedIngestionCredential,
): RuntimeMetricLabels {
  const labels: RuntimeMetricLabels = {
    route: logContext?.route,
    ...credentialMetricLabels(credential),
    outcome: outcomeFromEventResult(result),
    error_code: errorCodeFromEventResult(result),
  };

  if (result.ok) {
    labels.source = result.persisted.source;
    labels.producer_service = result.persisted.producerService;
    labels.producer_environment = result.persisted.producerEnvironment;
    labels.event_domain = result.persisted.domain;
    labels.event_name = result.persisted.name;
  }

  return labels;
}

function credentialMetricLabels(credential: AuthenticatedIngestionCredential): RuntimeMetricLabels {
  return {
    source: credential.source,
    producer_service: credential.producer.service,
    producer_environment: credential.producer.environment,
  };
}

function emitRequestCompleted(
  dependencies: EventsRouteOptions,
  logContext: RouteLogContext,
  status: number,
  outcome: RuntimeLogOutcome,
  errorCode?: string,
  extra: Partial<RuntimeLogInput> = {},
): void {
  const durationMs = Math.max(0, Date.now() - logContext.startedAt);
  const status_class = httpStatusClass(status);

  emitRuntimeLog(dependencies.observabilityLogSink, dependencies.runtimeEnvironment, {
    level: status >= 500 ? "error" : "info",
    event: "runtime.request.completed",
    request_id: logContext.observability.requestId,
    correlation_id: logContext.observability.correlationId,
    route: logContext.route,
    method: logContext.method,
    status,
    duration_ms: durationMs,
    outcome,
    error_code: errorCode,
    ...extra,
  });
  incrementRuntimeCounter(
    dependencies.observabilityMetricSink,
    dependencies.runtimeEnvironment,
    "data_dyna_http_requests_total",
    {
      route: logContext.route,
      method: logContext.method,
      status_class,
      outcome,
    },
  );
  observeRuntimeDuration(
    dependencies.observabilityMetricSink,
    dependencies.runtimeEnvironment,
    "data_dyna_http_request_duration_ms",
    durationMs,
    {
      route: logContext.route,
      method: logContext.method,
      status_class,
    },
  );

  if (status >= 500) {
    incrementRuntimeCounter(
      dependencies.observabilityMetricSink,
      dependencies.runtimeEnvironment,
      "data_dyna_runtime_errors_total",
      {
        route: logContext.route,
        method: logContext.method,
        error_code: errorCode ?? "unexpected_error",
      },
    );
  }
}

function eventCorrelationId(result: Extract<EventIngestionResult, { ok: true }>, logContext: RouteLogContext): string {
  if (result.duplicate) {
    return logContext.observability.correlationId;
  }

  return safeObservabilityId(result.persisted.event.correlation.correlationId) ?? logContext.observability.correlationId;
}

function credentialLogFields(credential: AuthenticatedIngestionCredential): Partial<RuntimeLogInput> {
  return {
    credential_id: credential.credentialId,
    merchant_id: credential.merchantId,
    source: credential.source,
    producer_service: credential.producer.service,
    producer_environment: credential.producer.environment,
  };
}

function outcomeFromEventResult(result: EventIngestionResult): RuntimeLogOutcome {
  if (result.ok) {
    return result.duplicate ? "duplicate" : "accepted";
  }

  if ("error" in result) {
    return outcomeFromTenantPolicyCode(result.error.code);
  }

  return "invalid";
}

function errorCodeFromEventResult(result: EventIngestionResult): string | undefined {
  if (result.ok) {
    return undefined;
  }

  return "error" in result ? result.error.code : "invalid_schema";
}

function outcomeFromBatchResult(result: BatchIngestionResult | InvalidEventResult): RuntimeLogOutcome {
  if (!("results" in result)) {
    return "invalid";
  }

  if (result.results.every((item) => item.ok && !item.duplicate)) {
    return "accepted";
  }

  if (result.results.some((item) => !item.ok)) {
    return "invalid";
  }

  return "duplicate";
}

function errorCodeFromBatchResult(result: BatchIngestionResult | InvalidEventResult): string | undefined {
  if (!("results" in result)) {
    return "invalid_schema";
  }

  return undefined;
}

function outcomeFromTenantPolicyCode(errorCode: "TENANT_IDENTITY_REQUIRED" | "TENANT_MISMATCH"): RuntimeLogOutcome {
  return errorCode === "TENANT_MISMATCH" ? "tenant_mismatch" : "tenant_identity_required";
}

function summarizeBatchResults(results: EventIngestionResult[]): {
  accepted: number;
  duplicate: number;
  invalid: number;
  tenantPolicyFailure: number;
} {
  return results.reduce(
    (summary, result) => {
      if (result.ok) {
        if (result.duplicate) {
          summary.duplicate += 1;
        } else {
          summary.accepted += 1;
        }
      } else if ("error" in result) {
        summary.tenantPolicyFailure += 1;
      } else {
        summary.invalid += 1;
      }

      return summary;
    },
    { accepted: 0, duplicate: 0, invalid: 0, tenantPolicyFailure: 0 },
  );
}
