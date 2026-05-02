import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { DataDynaEvent } from "../src/contracts/event-contract.ts";
import { parseDatameshMemberLabelsRows } from "../src/datamesh/rfm-member-labels.ts";
import { InMemoryRawEventStore } from "../src/ingestion/raw-event-store.ts";
import {
  InMemoryProjectionStore,
  rebuildBusinessProjections,
  runProjectionRebuildTask,
} from "../src/projections/business-projections.ts";

function event(overrides: Partial<DataDynaEvent>): DataDynaEvent {
  const correlation = {
    eventId: "evt-default",
    sessionId: "session-1",
    ...overrides.correlation,
  };

  return {
    version: "event-contract.v1",
    source: overrides.source ?? "pos",
    domain: overrides.domain ?? "transaction_scene",
    name: overrides.name ?? "pos.order_paid",
    occurredAt: overrides.occurredAt ?? "2026-05-02T10:00:00.000Z",
    producer: {
      service: "fixture",
      environment: "test",
      emittedAt: "2026-05-02T10:00:00.100Z",
      ...overrides.producer,
    },
    identity: {
      brandId: "brand-1",
      storeId: "store-1",
      memberId: "member-1",
      actorType: "cashier",
      ...overrides.identity,
    },
    correlation,
    entity: overrides.entity ?? {
      type: "order",
      id: "order-1",
    },
    properties: overrides.properties ?? {},
    idempotency: {
      key: `fixture:${correlation.eventId}`,
      scope: "store",
      ...overrides.idempotency,
    },
  };
}

async function persist(events: DataDynaEvent[]) {
  const store = new InMemoryRawEventStore();
  for (const acceptedEvent of events) {
    await store.persistAccepted(acceptedEvent);
  }
  return store.accepted();
}

const rawEvents = await persist([
  event({
    source: "mini_program",
    domain: "user_behavior",
    name: "mini_program.menu_item_viewed",
    occurredAt: "2026-05-02T09:55:00.000Z",
    identity: { actorType: "customer" },
    correlation: { eventId: "evt-menu-view", sessionId: "session-1" },
    entity: { type: "menu_item", id: "item-1" },
    properties: {
      menuId: "menu-breakfast",
      menuName: "Breakfast",
      itemName: "Latte",
      category: "coffee",
    },
  }),
  event({
    source: "mini_program",
    domain: "user_behavior",
    name: "mini_program.cart_updated",
    occurredAt: "2026-05-02T09:56:00.000Z",
    identity: { actorType: "customer" },
    correlation: { eventId: "evt-cart", sessionId: "session-1" },
    entity: { type: "cart", id: "cart-1" },
    properties: {
      items: [{ itemId: "item-1", itemName: "Latte", quantity: 2, amount: 42.5, menuId: "menu-breakfast" }],
    },
  }),
  event({
    source: "mini_program",
    domain: "user_behavior",
    name: "mini_program.checkout_started",
    occurredAt: "2026-05-02T09:57:00.000Z",
    identity: { actorType: "customer" },
    correlation: { eventId: "evt-checkout", sessionId: "session-1" },
    entity: { type: "cart", id: "cart-1" },
    properties: {
      cartId: "cart-1",
      orderId: "order-1",
      paymentStatus: "success",
      amount: 999,
    },
  }),
  event({
    name: "pos.order_opened",
    occurredAt: "2026-05-02T09:59:00.000Z",
    correlation: { eventId: "evt-order-open", sessionId: "session-pos-1" },
    properties: {
      currency: "CNY",
      items: [{ itemId: "item-1", itemName: "Latte", quantity: 2, amount: 42.5, menuId: "menu-breakfast" }],
    },
  }),
  event({
    name: "pos.order_paid",
    occurredAt: "2026-05-02T10:00:00.000Z",
    correlation: { eventId: "evt-order-paid", sessionId: "session-pos-1" },
    properties: {
      totalAmount: 42.5,
      currency: "CNY",
      paymentId: "payment-1",
      paymentMethod: "cash",
      items: [{ itemId: "item-1", itemName: "Latte", quantity: 2, amount: 42.5, menuId: "menu-breakfast" }],
    },
  }),
  event({
    name: "pos.refund_recorded",
    occurredAt: "2026-05-02T10:10:00.000Z",
    correlation: { eventId: "evt-refund", sessionId: "session-pos-1" },
    entity: { type: "refund", id: "refund-1" },
    properties: {
      orderId: "order-1",
      amount: 10,
      reason: "customer_return",
    },
  }),
  event({
    source: "mobile_hq",
    domain: "merchant_action",
    name: "mobile_hq.experiment_accepted",
    occurredAt: "2026-05-02T11:00:00.000Z",
    identity: { merchantId: "merchant-1", actorType: "merchant" },
    correlation: { eventId: "evt-action", sessionId: "hq-session-1" },
    entity: { type: "experiment_plan", id: "experiment-1" },
  }),
]);

const rfmRows = parseDatameshMemberLabelsRows([
  {
    memberStrId: "member-1",
    brandId: "brand-1",
    storeId: "store-1",
    snapshotDate: "2026-05-02",
    sourceTable: "report.crm.member_labels",
    rfm_tag: {
      rfm_tag_30d: "champion",
      rfm_tag_90d: "loyal",
      rfm_tag_180d: "new",
    },
    metrics: {
      latest_pay_time: "2026-05-02T10:00:00.000Z",
    },
    metrics_90d: {
      pay_cnt_90d: 3,
      pay_amount_90d: 128.5,
      avg_pay_amount_90d: 42.83,
    },
  },
]);

const projections = rebuildBusinessProjections({ rawEvents, rfmRows, rebuiltAt: "2026-05-02T12:00:00.000Z" });
assert.equal(projections.sessions.length, 3);
assert.equal(projections.carts.length, 1);
assert.equal(projections.orders.length, 1);
assert.equal(projections.orderItems.length, 1);
assert.equal(projections.payments.length, 1);
assert.equal(projections.refunds.length, 1);
assert.equal(projections.items.length, 1);
assert.equal(projections.menus.length, 1);
assert.equal(projections.members.length, 1);
assert.equal(projections.memberProfiles.length, 1);
assert.equal(projections.memberRfmSnapshots.length, 1);
assert.equal(projections.merchantActions.length, 1);

const order = projections.orders[0];
assert.equal(order?.orderId, "order-1");
assert.equal(order?.status, "refunded");
assert.equal(order?.totalAmount, 42.5);
assert.equal(order?.finalFactSource, "pos");
assert.deepEqual(order?.frontendAttributionEventIds, ["evt-checkout"]);
assert.equal(projections.payments[0]?.amount, 42.5);
assert.equal(projections.payments[0]?.finalFactSource, "pos");
assert.equal(projections.refunds[0]?.finalFactSource, "pos");

const cart = projections.carts[0];
assert.equal(cart?.status, "checkout_started");
assert.deepEqual(cart?.frontendAttributionEventIds, ["evt-checkout"]);

const rfmSnapshot = projections.memberRfmSnapshots[0];
assert.equal(rfmSnapshot?.sourceTable, "report.crm.member_labels");
assert.equal(rfmSnapshot?.rfmTag30d, "champion");
assert.equal(rfmSnapshot?.rfmTag90d, "loyal");
assert.equal(rfmSnapshot?.rfmTag180d, "new");
assert.equal(rfmSnapshot?.payCnt90d, 3);
assert.equal(rfmSnapshot?.payAmount90d, 128.5);
assert.equal(rfmSnapshot?.avgPayAmount90d, 42.83);

const rerun = rebuildBusinessProjections({ rawEvents, rfmRows, rebuiltAt: "2026-05-02T12:00:00.000Z" });
assert.deepEqual(rerun, projections);

const posOnlyRawEvents = await persist([
  event({
    name: "pos.order_paid",
    correlation: { eventId: "evt-pos-only-order", sessionId: "session-pos-only" },
    entity: { type: "order", id: "order-pos-only" },
    properties: {
      totalAmount: 18,
      items: [{ itemId: "item-pos-only", itemName: "Americano", quantity: 1, amount: 18, menuId: "menu-pos-only" }],
    },
  }),
]);
const posOnlyProjections = rebuildBusinessProjections({ rawEvents: posOnlyRawEvents, rebuiltAt: "2026-05-02T12:00:00.000Z" });
assert.equal(posOnlyProjections.items[0]?.menuId, "menu-pos-only");
assert.equal(posOnlyProjections.menus[0]?.menuId, "menu-pos-only");

const store = new InMemoryProjectionStore();
const taskResult = await runProjectionRebuildTask(
  { rawEvents, rfmRows, rebuiltAt: "2026-05-02T12:00:00.000Z" },
  store,
);
assert.deepEqual(taskResult, projections);
assert.deepEqual(await store.current(), projections);

const migration = readFileSync("migrations/0002_business_projections.sql", "utf8");
for (const table of [
  "sessions",
  "carts",
  "orders",
  "order_items",
  "payments",
  "refunds",
  "menus",
  "items",
  "members",
  "member_profiles",
  "member_rfm_snapshots",
  "merchant_actions",
]) {
  assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
}
assert.match(migration, /rfm_tag_30d TEXT NOT NULL/);
assert.match(migration, /rfm_tag_90d TEXT NOT NULL/);
assert.match(migration, /rfm_tag_180d TEXT NOT NULL/);
assert.match(migration, /pay_cnt_90d NUMERIC/);
assert.match(migration, /pay_amount_90d NUMERIC/);
assert.match(migration, /avg_pay_amount_90d NUMERIC/);
