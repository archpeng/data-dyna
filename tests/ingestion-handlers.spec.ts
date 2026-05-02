import assert from "node:assert/strict";
import { handlePostEvent, handlePostEventsBatch } from "../src/ingestion/event-handlers.ts";
import type { PostHogSinkEvent, AsyncPostHogSink } from "../src/ingestion/posthog-sink.ts";
import { InMemoryRawEventStore } from "../src/ingestion/raw-event-store.ts";

function validEvent(overrides: Record<string, unknown> = {}) {
  return {
    version: "event-contract.v1",
    source: "pos",
    domain: "transaction_scene",
    name: "pos.order_paid",
    occurredAt: "2026-05-02T10:00:00.000Z",
    producer: {
      service: "pos-lite-cashier",
      environment: "test",
      emittedAt: "2026-05-02T10:00:01.000Z",
    },
    identity: {
      brandId: "brand-1",
      storeId: "store-1",
      memberId: "member-1",
      actorType: "cashier",
    },
    correlation: {
      eventId: "evt-1",
      traceId: "trace-1",
    },
    entity: {
      type: "order",
      id: "order-1",
    },
    properties: {
      amount: 42.5,
      paymentMethod: "cash",
    },
    idempotency: {
      key: "pos-lite-cashier:evt-1",
      scope: "store",
    },
    ...overrides,
  };
}

class RecordingPostHogSink implements AsyncPostHogSink {
  readonly events: PostHogSinkEvent[] = [];

  async enqueue(event: PostHogSinkEvent): Promise<void> {
    this.events.push(event);
  }
}

const store = new InMemoryRawEventStore();
const postHogSink = new RecordingPostHogSink();

const accepted = await handlePostEvent(validEvent(), { store, postHogSink });
assert.equal(accepted.ok, true);
assert.equal(accepted.status, 202);
assert.equal(accepted.duplicate, false);
assert.equal(accepted.persisted.eventId, "evt-1");
assert.equal(accepted.persisted.idempotencyKey, "pos-lite-cashier:evt-1");
assert.equal(accepted.persisted.source, "pos");
assert.equal(accepted.persisted.storeId, "store-1");
assert.equal(accepted.persisted.entityType, "order");
assert.equal(accepted.persisted.properties.amount, 42.5);
assert.equal(store.accepted().length, 1);
assert.equal(postHogSink.events.length, 1);
assert.equal(postHogSink.events[0]?.event, "pos.order_paid");

const duplicate = await handlePostEvent(validEvent(), { store, postHogSink });
assert.equal(duplicate.ok, true);
assert.equal(duplicate.duplicate, true);
assert.equal(store.accepted().length, 1);
assert.equal(postHogSink.events.length, 1);

const invalid = await handlePostEvent(
  validEvent({
    idempotency: undefined,
  }),
  { store, postHogSink },
);
assert.equal(invalid.ok, false);
assert.equal(invalid.status, 400);
assert.equal(store.invalid().length, 1);
assert.match(invalid.invalid.reason, /Invalid input/);

const batch = await handlePostEventsBatch(
  [
    validEvent({
      correlation: { eventId: "evt-2" },
      entity: { type: "order", id: "order-2" },
      idempotency: { key: "pos-lite-cashier:evt-2", scope: "store" },
    }),
    validEvent({ source: "posthog" }),
  ],
  { store, postHogSink },
);
assert.equal(batch.status, 207);
assert.equal(batch.ok, false);
assert.equal(batch.results[0]?.ok, true);
assert.equal(batch.results[1]?.ok, false);
assert.equal(store.accepted().length, 2);
assert.equal(store.invalid().length, 2);
assert.equal(postHogSink.events.length, 2);

const notArray = await handlePostEventsBatch({ event: "not-array" }, { store, postHogSink });
assert.equal(notArray.ok, false);
assert.equal(notArray.status, 400);
assert.equal(store.invalid().length, 3);
