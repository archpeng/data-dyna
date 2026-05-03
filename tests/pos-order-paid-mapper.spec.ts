import assert from "node:assert/strict";
import { ZodError } from "zod";
import { mapPosOrderPaidToDataDynaEvent } from "../src/app/producers/pos-order-paid-mapper.ts";

const validFixture = {
  schemaVersion: "pos.order-paid.v1",
  source: "pos",
  merchantId: "merchant-local-a",
  storeId: "store-local-a",
  brandId: "brand-local-a",
  orderId: "order-local-0001",
  paymentId: "payment-local-0001",
  orderVersion: "paid-1",
  paidAt: "2026-05-03T12:00:00.000Z",
  emittedAt: "2026-05-03T12:00:01.000Z",
  producer: {
    service: "pos-lite-cashier",
    app: "pos-register",
    environment: "test",
  },
  cashierActorType: "cashier",
  orderChannel: "in_store_pos",
  paymentStatus: "paid",
  paymentMethodType: "card_present",
  currency: "CNY",
  lineItemCount: 2,
};

const event = mapPosOrderPaidToDataDynaEvent(validFixture);
assert.equal(event.version, "event-contract.v1");
assert.equal(event.source, "pos");
assert.equal(event.domain, "transaction_scene");
assert.equal(event.name, "pos.order_paid");
assert.equal(event.occurredAt, validFixture.paidAt);
assert.deepEqual(event.producer, {
  service: "pos-lite-cashier",
  app: "pos-register",
  environment: "test",
  emittedAt: validFixture.emittedAt,
  schemaRef: "pos.order-paid.v1 -> data-dyna.event-contract.v1",
});
assert.deepEqual(event.identity, {
  brandId: "brand-local-a",
  merchantId: "merchant-local-a",
  storeId: "store-local-a",
  actorType: "cashier",
});
assert.deepEqual(event.correlation, {
  eventId: "pos.order_paid:store-local-a:order-local-0001:payment-local-0001",
  correlationId: "pos-order:order-local-0001",
});
assert.deepEqual(event.entity, {
  type: "order",
  id: "order-local-0001",
  version: "paid-1",
});
assert.deepEqual(event.properties, {
  orderStatus: "paid",
  paymentStatus: "paid",
  orderChannel: "in_store_pos",
  paymentMethodType: "card_present",
  currency: "CNY",
  lineItemCount: 2,
});
assert.deepEqual(event.idempotency, {
  scope: "store",
  key: "pos.order_paid:v1:order-local-0001:payment-local-0001",
});

assertFixtureRejected({
  ...validFixture,
  merchantId: undefined,
});
assertFixtureRejected({
  ...validFixture,
  storeId: undefined,
});
assertFixtureRejected({
  ...validFixture,
  orderId: undefined,
});
assertFixtureRejected({
  ...validFixture,
  paymentId: undefined,
});
assertFixtureRejected({
  ...validFixture,
  idempotency: {
    scope: "global",
    key: "unsafe-fixture-idempotency-key",
  },
});
assertFixtureRejected({
  ...validFixture,
  source: "mini_program",
});
assertFixtureRejected({
  ...validFixture,
  producer: {
    ...validFixture.producer,
    service: "wrong-pos-producer",
  },
});
assertFixtureRejected({
  ...validFixture,
  producer: {
    ...validFixture.producer,
    environment: "prod",
  },
});

for (const unsafeField of [
  "bearerToken",
  "paymentPan",
  "paymentAuthorizationCode",
  "customerPhone",
  "customerId",
  "memberId",
  "deviceId",
  "employeeId",
  "exactSaleAmount",
  "lineItems",
]) {
  assertFixtureRejected({
    ...validFixture,
    [unsafeField]: "unsafe-fixture-value",
  });
}

function assertFixtureRejected(fixture: Record<string, unknown>): void {
  assert.throws(() => mapPosOrderPaidToDataDynaEvent(fixture), ZodError);
}
