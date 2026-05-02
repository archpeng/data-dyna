import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { BusinessProjections } from "../src/projections/business-projections.ts";
import {
  INDEPENDENT_CAFE_METRIC_IDS,
  rebuildIndependentCafeSnapshots,
  type MerchantConfirmationInput,
} from "../src/snapshots/independent-cafe-snapshots.ts";

const projections: BusinessProjections = {
  run: {
    projectionName: "business_projections.v1",
    rebuiltAt: "2026-05-02T12:00:00.000Z",
    sourceEventCount: 10,
    sourceRfmRowCount: 2,
  },
  sessions: [],
  carts: [
    {
      cartId: "cart-1",
      brandId: "brand-1",
      storeId: "store-1",
      memberId: "member-1",
      sessionId: "session-1",
      status: "checkout_started",
      checkoutStartedAt: "2026-05-02T09:57:00.000Z",
      frontendAttributionEventIds: ["evt-checkout"],
      sourceEventIds: ["evt-cart", "evt-checkout"],
    },
    {
      cartId: "cart-2",
      brandId: "brand-1",
      storeId: "store-1",
      memberId: "member-2",
      sessionId: "session-2",
      status: "updated",
      frontendAttributionEventIds: [],
      sourceEventIds: ["evt-cart-2"],
    },
  ],
  orders: [
    {
      orderId: "order-1",
      brandId: "brand-1",
      storeId: "store-1",
      memberId: "member-1",
      status: "paid",
      paidAt: "2026-05-02T10:00:00.000Z",
      totalAmount: 40,
      currency: "CNY",
      finalFactSource: "pos",
      sourceEventIds: ["evt-order-paid-1"],
      frontendAttributionEventIds: ["evt-checkout"],
    },
    {
      orderId: "order-2",
      brandId: "brand-1",
      storeId: "store-1",
      memberId: "member-2",
      status: "refunded",
      paidAt: "2026-05-02T10:30:00.000Z",
      totalAmount: 60,
      currency: "CNY",
      finalFactSource: "pos",
      sourceEventIds: ["evt-order-paid-2", "evt-refund-1"],
      frontendAttributionEventIds: [],
    },
  ],
  orderItems: [],
  payments: [],
  refunds: [
    {
      refundId: "refund-1",
      orderId: "order-2",
      brandId: "brand-1",
      storeId: "store-1",
      amount: 10,
      reason: "customer_return",
      refundedAt: "2026-05-02T10:40:00.000Z",
      finalFactSource: "pos",
      sourceEventId: "evt-refund-1",
    },
  ],
  items: [
    {
      itemId: "item-latte",
      brandId: "brand-1",
      storeId: "store-1",
      menuId: "menu-breakfast",
      itemName: "Latte",
      category: "coffee",
      sourceEventIds: ["evt-menu-view"],
    },
  ],
  menus: [
    {
      menuId: "menu-breakfast",
      brandId: "brand-1",
      storeId: "store-1",
      menuName: "Cafe Breakfast",
      sourceEventIds: ["evt-menu-view"],
    },
  ],
  members: [],
  memberProfiles: [],
  memberRfmSnapshots: [
    {
      memberId: "member-1",
      brandId: "brand-1",
      storeId: "store-1",
      snapshotDate: "2026-05-02",
      sourceTable: "report.crm.member_labels",
      rfmTag30d: "champion",
      rfmTag90d: "loyal",
      rfmTag180d: "new",
      latestPayTime: "2026-05-02T10:00:00.000Z",
      payCnt90d: 3,
      payAmount90d: 120,
      avgPayAmount90d: 40,
    },
    {
      memberId: "member-2",
      brandId: "brand-1",
      storeId: "store-1",
      snapshotDate: "2026-05-02",
      sourceTable: "report.crm.member_labels",
      rfmTag30d: "new",
      rfmTag90d: "new",
      rfmTag180d: "new",
      latestPayTime: "2026-05-02T10:30:00.000Z",
      payCnt90d: 1,
      payAmount90d: 60,
      avgPayAmount90d: 60,
    },
  ],
  merchantActions: [],
};

const segmentCandidateId = "restaurant_segment:brand-1:store-1:2026-05-02:independent_cafe_core";
const confirmations: MerchantConfirmationInput[] = [
  {
    confirmationId: "confirm-segment-1",
    brandId: "brand-1",
    storeId: "store-1",
    targetType: "restaurant_segment",
    targetId: segmentCandidateId,
    status: "confirmed",
    confirmedAt: "2026-05-02T13:00:00.000Z",
    evidenceRefs: ["mobile_hq:merchant-confirmed-independent-cafe"],
  },
];

const snapshots = rebuildIndependentCafeSnapshots({
  projections,
  brandId: "brand-1",
  storeId: "store-1",
  snapshotDate: "2026-05-02",
  merchantConfirmations: confirmations,
});

assert.equal(snapshots.storeProfileSnapshots.length, 1);
assert.equal(snapshots.metricDefinitions.length, 4);
assert.equal(snapshots.metricSnapshots.length, 4);
assert.equal(snapshots.restaurantSegments.length, 1);
assert.equal(snapshots.merchantConfirmations.length, 1);

const storeProfile = snapshots.storeProfileSnapshots[0];
assert.equal(storeProfile?.restaurantCategory, "independent_cafe");
assert.equal(storeProfile?.menuCount, 1);
assert.equal(storeProfile?.itemCount, 1);
assert.equal(storeProfile?.paidOrderCount, 2);
assert.equal(storeProfile?.memberRfmSnapshotCount, 2);
assert.ok(storeProfile?.evidenceRefs.includes("items:item-latte"));
assert.ok(storeProfile?.evidenceRefs.includes("member_rfm_snapshots:brand-1:member-1:2026-05-02"));

for (const metricId of INDEPENDENT_CAFE_METRIC_IDS) {
  const definition = snapshots.metricDefinitions.find((candidate) => candidate.metricId === metricId);
  assert.ok(definition, `${metricId} definition exists`);
  assert.ok(definition.numerator.length > 0, `${metricId} numerator documented`);
  assert.ok(definition.denominator.length > 0, `${metricId} denominator documented`);
  assert.ok(definition.window.length > 0, `${metricId} window documented`);
  assert.equal(definition.owner, "data-dyna-core");
  assert.ok(definition.source.length > 0, `${metricId} source documented`);
  assert.ok(definition.projectionInputRefs.every((ref) => ref.startsWith("BusinessProjections.")));
  assert.ok(definition.guardrailRelation.length > 0, `${metricId} guardrail relation documented`);
}

const metric = (metricId: string) => snapshots.metricSnapshots.find((snapshot) => snapshot.definition.metricId === metricId);
assert.equal(metric("repurchase_90d_rate")?.numeratorValue, 1);
assert.equal(metric("repurchase_90d_rate")?.denominatorValue, 2);
assert.equal(metric("repurchase_90d_rate")?.value, 0.5);
assert.equal(metric("avg_order_value")?.numeratorValue, 100);
assert.equal(metric("avg_order_value")?.denominatorValue, 2);
assert.equal(metric("avg_order_value")?.value, 50);
assert.equal(metric("refund_rate")?.numeratorValue, 1);
assert.equal(metric("refund_rate")?.denominatorValue, 2);
assert.equal(metric("refund_rate")?.value, 0.5);
assert.equal(metric("checkout_started_cart_rate")?.numeratorValue, 1);
assert.equal(metric("checkout_started_cart_rate")?.denominatorValue, 2);
assert.equal(metric("checkout_started_cart_rate")?.value, 0.5);

const segment = snapshots.restaurantSegments[0];
assert.equal(segment?.segmentCandidateId, segmentCandidateId);
assert.equal(segment?.label, "independent_cafe_core");
assert.equal(segment?.confirmationStatus, "confirmed");
assert.equal(segment?.confirmationId, "confirm-segment-1");
assert.equal(segment?.classificationMethod, "deterministic_projection_rule");
assert.ok(segment.confidence >= 0.8);
assert.ok(segment.evidenceRefs.length > 0);

const rerun = rebuildIndependentCafeSnapshots({
  projections,
  brandId: "brand-1",
  storeId: "store-1",
  snapshotDate: "2026-05-02",
  merchantConfirmations: confirmations,
});
assert.deepEqual(rerun, snapshots);

const migration = readFileSync("migrations/0003_independent_cafe_snapshots.sql", "utf8");
for (const table of ["store_profile_snapshots", "metric_snapshots", "restaurant_segments", "merchant_confirmations"]) {
  assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
}
const unconfirmedSnapshots = rebuildIndependentCafeSnapshots({
  projections,
  brandId: "brand-1",
  storeId: "store-1",
  snapshotDate: "2026-05-02",
});
assert.equal(unconfirmedSnapshots.restaurantSegments[0]?.confirmationStatus, "unconfirmed");
assert.equal(unconfirmedSnapshots.restaurantSegments[0]?.confirmationId, undefined);

assert.match(migration, /classification_method TEXT NOT NULL CHECK \(classification_method = 'deterministic_projection_rule'\)/);
assert.match(migration, /confirmation_status TEXT NOT NULL CHECK \(confirmation_status IN \('unconfirmed', 'confirmed', 'rejected'\)\)/);
assert.match(migration, /projection_input_refs TEXT\[\] NOT NULL/);
assert.match(migration, /guardrail_relation TEXT NOT NULL/);
assert.match(migration, /restaurant_category TEXT NOT NULL CHECK \(restaurant_category = 'independent_cafe'\)/);
