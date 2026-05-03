import { ZodError } from "zod";
import { DataDynaEventSchema, type DataDynaEvent } from "../contracts/event-contract.ts";
import type {
  InvalidRawEventAuditContext,
  InvalidRawEventRecord,
  PersistAcceptedResult,
  RawEventStore,
} from "./raw-event-store.ts";
import { toPostHogSinkEvent, type AsyncPostHogSink } from "./posthog-sink.ts";

export type AuthenticatedIngestionContext = {
  credentialId: string;
  merchantId: string;
  storeIds: readonly string[];
  producer: {
    service: string;
    environment: string;
  };
  source: string;
};

export type IngestionDependencies = {
  store: RawEventStore;
  postHogSink?: AsyncPostHogSink;
};

export type AcceptedEventResult = {
  ok: true;
  status: 202;
  duplicate: boolean;
  persisted: PersistAcceptedResult["record"];
};

export type InvalidEventResult = {
  ok: false;
  status: 400;
  invalid: InvalidRawEventRecord;
};

export type TenantPolicyFailureResult = {
  ok: false;
  status: 400 | 403;
  error: {
    code: TenantPolicyErrorCode;
    message: string;
  };
  invalid: InvalidRawEventRecord;
};

export type EventIngestionResult = AcceptedEventResult | InvalidEventResult | TenantPolicyFailureResult;

type TenantPolicyErrorCode = "TENANT_IDENTITY_REQUIRED" | "TENANT_MISMATCH";

type TenantPolicyValidation =
  | { ok: true }
  | {
      ok: false;
      status: TenantPolicyFailureResult["status"];
      code: TenantPolicyErrorCode;
      message: string;
    };

export async function handlePostEvent(
  payload: unknown,
  dependencies: IngestionDependencies,
  context?: AuthenticatedIngestionContext,
): Promise<EventIngestionResult> {
  const parsed = DataDynaEventSchema.safeParse(payload);
  if (!parsed.success) {
    return rejectInvalidEvent(payload, parsed.error, dependencies.store, context);
  }

  if (context) {
    const tenantPolicy = validateTenantPolicy(parsed.data, context);
    if (!tenantPolicy.ok) {
      return rejectTenantPolicy(parsed.data, tenantPolicy, dependencies.store, context);
    }
  }

  const persisted = await dependencies.store.persistAccepted(
    parsed.data,
    context ? { credentialId: context.credentialId } : undefined,
  );
  if (!persisted.duplicate) {
    enqueueProductAnalytics(parsed.data, dependencies.postHogSink);
  }

  return {
    ok: true,
    status: 202,
    duplicate: persisted.duplicate,
    persisted: persisted.record,
  };
}

export type BatchIngestionResult = {
  ok: boolean;
  status: 207;
  results: EventIngestionResult[];
};

export async function handlePostEventsBatch(
  payload: unknown,
  dependencies: IngestionDependencies,
  context?: AuthenticatedIngestionContext,
): Promise<BatchIngestionResult | InvalidEventResult> {
  if (!Array.isArray(payload)) {
    const invalid = await dependencies.store.persistInvalid(
      payload,
      "Batch payload must be an array",
      buildInvalidAuditContext(context),
    );
    return { ok: false, status: 400, invalid };
  }

  const results = await Promise.all(
    payload.map((eventPayload) => handlePostEvent(eventPayload, dependencies, context)),
  );
  return {
    ok: results.every((result) => result.ok),
    status: 207,
    results,
  };
}

async function rejectInvalidEvent(
  payload: unknown,
  error: ZodError,
  store: RawEventStore,
  context?: AuthenticatedIngestionContext,
): Promise<InvalidEventResult> {
  const invalid = await store.persistInvalid(
    payload,
    error.issues.map((issue) => issue.message).join("; "),
    buildInvalidAuditContext(context),
  );
  return {
    ok: false,
    status: 400,
    invalid,
  };
}

async function rejectTenantPolicy(
  event: DataDynaEvent,
  tenantPolicy: Exclude<TenantPolicyValidation, { ok: true }>,
  store: RawEventStore,
  context: AuthenticatedIngestionContext,
): Promise<TenantPolicyFailureResult> {
  const invalid = await store.persistInvalid(
    event,
    tenantPolicy.message,
    buildInvalidAuditContext(context, event, tenantPolicy.code),
  );

  return {
    ok: false,
    status: tenantPolicy.status,
    error: {
      code: tenantPolicy.code,
      message: tenantPolicy.message,
    },
    invalid,
  };
}

function validateTenantPolicy(event: DataDynaEvent, context: AuthenticatedIngestionContext): TenantPolicyValidation {
  if (
    !event.identity.merchantId ||
    !event.identity.storeId ||
    !event.producer.environment ||
    event.idempotency.scope !== "store"
  ) {
    return {
      ok: false,
      status: 400,
      code: "TENANT_IDENTITY_REQUIRED",
      message: "Tenant identity required",
    };
  }

  if (
    event.identity.merchantId !== context.merchantId ||
    !context.storeIds.includes(event.identity.storeId) ||
    event.producer.service !== context.producer.service ||
    event.producer.environment !== context.producer.environment ||
    event.source !== context.source
  ) {
    return {
      ok: false,
      status: 403,
      code: "TENANT_MISMATCH",
      message: "Tenant mismatch",
    };
  }

  return { ok: true };
}

function buildInvalidAuditContext(
  context?: AuthenticatedIngestionContext,
  event?: DataDynaEvent,
  reasonCode?: string,
): InvalidRawEventAuditContext | undefined {
  if (!context) {
    return undefined;
  }

  return {
    credentialId: context.credentialId,
    merchantId: event?.identity.merchantId ?? context.merchantId,
    storeId: event?.identity.storeId ?? context.storeIds[0],
    producerService: event?.producer.service ?? context.producer.service,
    producerEnvironment: event?.producer.environment ?? context.producer.environment,
    source: event?.source ?? context.source,
    reasonCode,
  };
}

function enqueueProductAnalytics(event: DataDynaEvent, sink?: AsyncPostHogSink): void {
  if (!sink) {
    return;
  }

  void sink.enqueue(toPostHogSinkEvent(event)).catch(() => undefined);
}
