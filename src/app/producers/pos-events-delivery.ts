import type { DataDynaEvent } from "../../contracts/event-contract.ts";
import { mapPosOrderPaidToDataDynaEvent } from "./pos-order-paid-mapper.ts";

export const POS_EVENTS_ROUTE = "/events" as const;
export const POS_EVENTS_DELIVERY_TIMEOUT_MS = 1500 as const;

export type PosEventsDeliveryTransportRequest = {
  method: "POST";
  path: typeof POS_EVENTS_ROUTE;
  headers: Record<string, string>;
  timeoutMs: number;
  payload: unknown;
};

export type PosEventsDeliveryTransportResponse = {
  statusCode: number;
  body: unknown;
};

export type PosEventsDeliveryTransport = (
  request: PosEventsDeliveryTransportRequest,
) => Promise<PosEventsDeliveryTransportResponse>;

export type PosEventsDeliveryOutcome =
  | "sent"
  | "duplicate"
  | "invalid_payload"
  | "tenant_identity_required"
  | "unauthorized"
  | "tenant_mismatch"
  | "transient_send_failure";

export type PosEventsDeliveryRetryAdvice =
  | "none"
  | "fix_payload_contract"
  | "fix_credentials"
  | "fix_tenant_mapping"
  | "retry_or_backfill";

export type PosEventsDeliveryResult = {
  ok: boolean;
  outcome: PosEventsDeliveryOutcome;
  statusCode?: number;
  retryAdvice: PosEventsDeliveryRetryAdvice;
  primaryFlowBlocked: false;
};

export type PosEventsDeliveryOptions = {
  bearerToken: string;
  transport: PosEventsDeliveryTransport;
  timeoutMs?: number;
};

export async function deliverPosOrderPaidFixtureToEvents(
  fixture: unknown,
  options: PosEventsDeliveryOptions,
): Promise<PosEventsDeliveryResult> {
  let event: DataDynaEvent;
  try {
    event = mapPosOrderPaidToDataDynaEvent(fixture);
  } catch {
    return deliveryResult("invalid_payload", undefined, "fix_payload_contract");
  }

  return sendDataDynaEventToEvents(event, options);
}

export async function sendDataDynaEventToEvents(
  payload: DataDynaEvent | unknown,
  options: PosEventsDeliveryOptions,
): Promise<PosEventsDeliveryResult> {
  const timeoutMs = Math.max(1, options.timeoutMs ?? POS_EVENTS_DELIVERY_TIMEOUT_MS);
  try {
    const response = await withTransportTimeout(
      options.transport({
        method: "POST",
        path: POS_EVENTS_ROUTE,
        headers: {
          authorization: `Bearer ${options.bearerToken}`,
          "content-type": "application/json",
        },
        timeoutMs,
        payload,
      }),
      timeoutMs,
    );
    if (!response) {
      return deliveryResult("transient_send_failure", undefined, "retry_or_backfill");
    }

    return classifyEventsDeliveryResponse(response.statusCode, response.body);
  } catch {
    return deliveryResult("transient_send_failure", undefined, "retry_or_backfill");
  }
}

async function withTransportTimeout(
  transportResponse: Promise<PosEventsDeliveryTransportResponse>,
  timeoutMs: number,
): Promise<PosEventsDeliveryTransportResponse | undefined> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      transportResponse,
      new Promise<undefined>((resolve) => {
        timeout = setTimeout(() => resolve(undefined), Math.max(1, timeoutMs));
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function classifyEventsDeliveryResponse(statusCode: number, body: unknown): PosEventsDeliveryResult {
  if (statusCode === 202) {
    return deliveryResult(isDuplicateResponse(body) ? "duplicate" : "sent", statusCode, "none", true);
  }

  if (statusCode === 401) {
    return deliveryResult("unauthorized", statusCode, "fix_credentials");
  }

  if (statusCode === 403) {
    return deliveryResult("tenant_mismatch", statusCode, "fix_tenant_mapping");
  }

  if (statusCode === 400 && errorCode(body) === "TENANT_IDENTITY_REQUIRED") {
    return deliveryResult("tenant_identity_required", statusCode, "fix_tenant_mapping");
  }

  if (statusCode === 400) {
    return deliveryResult("invalid_payload", statusCode, "fix_payload_contract");
  }

  if (statusCode >= 500) {
    return deliveryResult("transient_send_failure", statusCode, "retry_or_backfill");
  }

  return deliveryResult("invalid_payload", statusCode, "fix_payload_contract");
}

function deliveryResult(
  outcome: PosEventsDeliveryOutcome,
  statusCode: number | undefined,
  retryAdvice: PosEventsDeliveryRetryAdvice,
  ok = false,
): PosEventsDeliveryResult {
  return {
    ok,
    outcome,
    statusCode,
    retryAdvice,
    primaryFlowBlocked: false,
  };
}

function isDuplicateResponse(body: unknown): boolean {
  return bodyObject(body)["duplicate"] === true;
}

function errorCode(body: unknown): string | undefined {
  const error = bodyObject(body)["error"];
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const code = (error as Record<string, unknown>)["code"];
  return typeof code === "string" ? code : undefined;
}

function bodyObject(body: unknown): Record<string, unknown> {
  return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}
