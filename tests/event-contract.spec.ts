import assert from "node:assert/strict";
import {
  DataDynaEventSchema,
  EventSourceSchema,
  parseDataDynaEvent,
} from "../src/contracts/event-contract.ts";

const validEvent = {
  version: "event-contract.v1",
  source: "mini_program",
  domain: "user_behavior",
  name: "mini_program.cart_updated",
  occurredAt: "2026-05-02T10:00:00.000Z",
  producer: {
    service: "mini-order",
    app: "wechat-mini-program",
    environment: "test",
    emittedAt: "2026-05-02T10:00:01.000Z",
    schemaRef: "data-dyna.event-contract.v1",
  },
  identity: {
    brandId: "brand-1",
    storeId: "store-1",
    memberId: "member-1",
    deviceId: "device-1",
    actorType: "customer",
  },
  correlation: {
    eventId: "evt-1",
    traceId: "trace-1",
    sessionId: "session-1",
    requestId: "request-1",
    correlationId: "cart-1",
  },
  entity: {
    type: "cart",
    id: "cart-1",
    version: "1",
  },
  properties: {
    itemCount: 2,
    channel: "mini_program",
    nested: {
      skuIds: ["sku-1", "sku-2"],
    },
  },
  idempotency: {
    key: "mini-order:evt-1",
    scope: "producer",
  },
};

const parsed = parseDataDynaEvent(validEvent);
assert.equal(parsed.version, "event-contract.v1");
assert.equal(parsed.source, "mini_program");
assert.equal(parsed.producer.service, "mini-order");
assert.equal(parsed.identity.storeId, "store-1");
assert.equal(parsed.correlation.eventId, "evt-1");
assert.equal(parsed.entity.type, "cart");
assert.equal(parsed.idempotency.key, "mini-order:evt-1");

for (const source of ["mini_program", "pos", "mobile_hq", "datamesh", "system"] as const) {
  assert.equal(EventSourceSchema.parse(source), source);
}

assert.equal(
  DataDynaEventSchema.safeParse({
    ...validEvent,
    idempotency: undefined,
  }).success,
  false,
);

assert.equal(
  DataDynaEventSchema.safeParse({
    ...validEvent,
    version: "agent-recommendation.v1",
  }).success,
  false,
);

assert.equal(
  DataDynaEventSchema.safeParse({
    ...validEvent,
    source: "agent",
  }).success,
  false,
);
