import { ZodError } from "zod";
import { DataDynaEventSchema, type DataDynaEvent } from "../contracts/event-contract.ts";
import type { RawEventStore, PersistAcceptedResult, InvalidRawEventRecord } from "./raw-event-store.ts";
import { toPostHogSinkEvent, type AsyncPostHogSink } from "./posthog-sink.ts";

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

export type EventIngestionResult = AcceptedEventResult | InvalidEventResult;

export async function handlePostEvent(
  payload: unknown,
  dependencies: IngestionDependencies,
): Promise<EventIngestionResult> {
  const parsed = DataDynaEventSchema.safeParse(payload);
  if (!parsed.success) {
    return rejectInvalidEvent(payload, parsed.error, dependencies.store);
  }

  const persisted = await dependencies.store.persistAccepted(parsed.data);
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
): Promise<BatchIngestionResult | InvalidEventResult> {
  if (!Array.isArray(payload)) {
    const invalid = await dependencies.store.persistInvalid(payload, "Batch payload must be an array");
    return { ok: false, status: 400, invalid };
  }

  const results = await Promise.all(payload.map((eventPayload) => handlePostEvent(eventPayload, dependencies)));
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
): Promise<InvalidEventResult> {
  const invalid = await store.persistInvalid(payload, error.issues.map((issue) => issue.message).join("; "));
  return {
    ok: false,
    status: 400,
    invalid,
  };
}

function enqueueProductAnalytics(event: DataDynaEvent, sink?: AsyncPostHogSink): void {
  if (!sink) {
    return;
  }

  void sink.enqueue(toPostHogSinkEvent(event)).catch(() => undefined);
}
