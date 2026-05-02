import { z } from "zod";
import type { BusinessProjections } from "../projections/business-projections.ts";

export const SnapshotMetricIdSchema = z.enum([
  "repurchase_90d_rate",
  "avg_order_value",
  "refund_rate",
  "checkout_started_cart_rate",
]);

export const GuardrailRelationSchema = z.enum(["growth_metric", "negative_guardrail", "funnel_metric"]);
export const ConfirmationStatusSchema = z.enum(["unconfirmed", "confirmed", "rejected"]);

export type SnapshotMetricId = z.infer<typeof SnapshotMetricIdSchema>;
export type GuardrailRelation = z.infer<typeof GuardrailRelationSchema>;
export type ConfirmationStatus = z.infer<typeof ConfirmationStatusSchema>;

export type MetricDefinition = {
  metricId: SnapshotMetricId;
  label: string;
  numerator: string;
  denominator: string;
  window: "snapshot" | "90d";
  owner: "data-dyna-core";
  source: string[];
  projectionInputRefs: string[];
  guardrailRelation: GuardrailRelation;
};

export type MetricSnapshot = {
  metricSnapshotId: string;
  brandId: string;
  storeId: string;
  snapshotDate: string;
  definition: MetricDefinition;
  numeratorValue: number;
  denominatorValue: number;
  value: number | null;
  evidenceRefs: string[];
};

export type StoreProfileSnapshot = {
  storeProfileSnapshotId: string;
  brandId: string;
  storeId: string;
  snapshotDate: string;
  restaurantCategory: "independent_cafe";
  menuCount: number;
  itemCount: number;
  paidOrderCount: number;
  memberRfmSnapshotCount: number;
  evidenceRefs: string[];
};

export type MerchantConfirmationInput = {
  confirmationId: string;
  brandId: string;
  storeId: string;
  targetType: "restaurant_segment";
  targetId: string;
  status: Exclude<ConfirmationStatus, "unconfirmed">;
  confirmedAt: string;
  evidenceRefs: string[];
};

export type MerchantConfirmation = MerchantConfirmationInput & {
  source: "merchant_confirmation_fixture";
};

export type RestaurantSegmentCandidate = {
  segmentCandidateId: string;
  brandId: string;
  storeId: string;
  snapshotDate: string;
  label: "independent_cafe_core";
  confidence: number;
  evidenceRefs: string[];
  confirmationStatus: ConfirmationStatus;
  confirmationId?: string;
  classificationMethod: "deterministic_projection_rule";
};

export type IndependentCafeSnapshots = {
  storeProfileSnapshots: StoreProfileSnapshot[];
  metricDefinitions: MetricDefinition[];
  metricSnapshots: MetricSnapshot[];
  restaurantSegments: RestaurantSegmentCandidate[];
  merchantConfirmations: MerchantConfirmation[];
};

export type IndependentCafeSnapshotInput = {
  projections: BusinessProjections;
  brandId: string;
  storeId: string;
  snapshotDate: string;
  merchantConfirmations?: MerchantConfirmationInput[];
};

export const INDEPENDENT_CAFE_METRIC_IDS: SnapshotMetricId[] = [
  "repurchase_90d_rate",
  "avg_order_value",
  "refund_rate",
  "checkout_started_cart_rate",
];

export function rebuildIndependentCafeSnapshots(input: IndependentCafeSnapshotInput): IndependentCafeSnapshots {
  const storeRef = `${input.brandId}:${input.storeId}:${input.snapshotDate}`;
  const menuRefs = sourceRefs(
    input.projections.menus.filter((menu) => belongsToStore(menu, input.brandId, input.storeId)),
    "menus",
    (menu) => menu.menuId,
  );
  const itemRefs = sourceRefs(
    input.projections.items.filter((item) => belongsToStore(item, input.brandId, input.storeId)),
    "items",
    (item) => item.itemId,
  );
  const paidOrders = input.projections.orders.filter(
    (order) => belongsToStore(order, input.brandId, input.storeId) && order.paidAt && order.totalAmount !== undefined,
  );
  const paidOrderRefs = sourceRefs(paidOrders, "orders", (order) => order.orderId);
  const rfmSnapshots = input.projections.memberRfmSnapshots.filter((snapshot) => belongsToStore(snapshot, input.brandId, input.storeId));
  const rfmRefs = sourceRefs(rfmSnapshots, "member_rfm_snapshots", (snapshot) => `${snapshot.brandId}:${snapshot.memberId}:${snapshot.snapshotDate}`);

  const storeProfileSnapshot: StoreProfileSnapshot = {
    storeProfileSnapshotId: `store_profile:${storeRef}`,
    brandId: input.brandId,
    storeId: input.storeId,
    snapshotDate: input.snapshotDate,
    restaurantCategory: "independent_cafe",
    menuCount: menuRefs.length,
    itemCount: itemRefs.length,
    paidOrderCount: paidOrders.length,
    memberRfmSnapshotCount: rfmSnapshots.length,
    evidenceRefs: uniqueSorted([...menuRefs, ...itemRefs, ...paidOrderRefs, ...rfmRefs]),
  };

  const segmentCandidateId = `restaurant_segment:${storeRef}:independent_cafe_core`;
  const merchantConfirmations = (input.merchantConfirmations ?? [])
    .filter((confirmation) => confirmation.brandId === input.brandId && confirmation.storeId === input.storeId)
    .map((confirmation) => ({ ...confirmation, source: "merchant_confirmation_fixture" as const }))
    .sort((left, right) => compareStrings(left.confirmationId, right.confirmationId));
  const segmentConfirmation = merchantConfirmations.find((confirmation) => confirmation.targetId === segmentCandidateId);
  const restaurantSegments: RestaurantSegmentCandidate[] = [
    {
      segmentCandidateId,
      brandId: input.brandId,
      storeId: input.storeId,
      snapshotDate: input.snapshotDate,
      label: "independent_cafe_core",
      confidence: independentCafeConfidence(input.projections, input.brandId, input.storeId),
      evidenceRefs: storeProfileSnapshot.evidenceRefs,
      confirmationStatus: segmentConfirmation?.status ?? "unconfirmed",
      confirmationId: segmentConfirmation?.confirmationId,
      classificationMethod: "deterministic_projection_rule",
    },
  ];

  const metricSnapshots = INDEPENDENT_CAFE_METRIC_IDS.map((metricId) => buildMetricSnapshot(metricId, input));
  const metricDefinitions = metricSnapshots.map((snapshot) => snapshot.definition);

  return {
    storeProfileSnapshots: [storeProfileSnapshot],
    metricDefinitions,
    metricSnapshots,
    restaurantSegments,
    merchantConfirmations,
  };
}

function buildMetricSnapshot(metricId: SnapshotMetricId, input: IndependentCafeSnapshotInput): MetricSnapshot {
  const paidOrders = input.projections.orders.filter(
    (order) => belongsToStore(order, input.brandId, input.storeId) && order.paidAt && order.totalAmount !== undefined,
  );
  const refunds = input.projections.refunds.filter((refund) => belongsToStore(refund, input.brandId, input.storeId));
  const carts = input.projections.carts.filter((cart) => belongsToStore(cart, input.brandId, input.storeId));
  const checkoutStartedCarts = carts.filter((cart) => cart.status === "checkout_started");
  const rfmSnapshots = input.projections.memberRfmSnapshots.filter((snapshot) => belongsToStore(snapshot, input.brandId, input.storeId));
  const payingMembers90d = rfmSnapshots.filter((snapshot) => snapshot.payCnt90d >= 1);
  const repeatMembers90d = rfmSnapshots.filter((snapshot) => snapshot.payCnt90d >= 2);

  if (metricId === "repurchase_90d_rate") {
    const evidenceRefs = sourceRefs(rfmSnapshots, "member_rfm_snapshots", (snapshot) => `${snapshot.brandId}:${snapshot.memberId}:${snapshot.snapshotDate}`);
    return metricSnapshot(input, metricId, repeatMembers90d.length, payingMembers90d.length, evidenceRefs);
  }

  if (metricId === "avg_order_value") {
    const evidenceRefs = sourceRefs(paidOrders, "orders", (order) => order.orderId);
    const orderAmountSum = paidOrders.reduce((sum, order) => sum + (order.totalAmount ?? 0), 0);
    return metricSnapshot(input, metricId, orderAmountSum, paidOrders.length, evidenceRefs);
  }

  if (metricId === "refund_rate") {
    const evidenceRefs = uniqueSorted([
      ...sourceRefs(refunds, "refunds", (refund) => refund.refundId),
      ...sourceRefs(paidOrders, "orders", (order) => order.orderId),
    ]);
    return metricSnapshot(input, metricId, refunds.length, paidOrders.length, evidenceRefs);
  }

  const evidenceRefs = sourceRefs(carts, "carts", (cart) => cart.cartId);
  return metricSnapshot(input, metricId, checkoutStartedCarts.length, carts.length, evidenceRefs);
}

function metricSnapshot(
  input: IndependentCafeSnapshotInput,
  metricId: SnapshotMetricId,
  numeratorValue: number,
  denominatorValue: number,
  evidenceRefs: string[],
): MetricSnapshot {
  const definition = metricDefinition(metricId);
  return {
    metricSnapshotId: `metric:${input.brandId}:${input.storeId}:${input.snapshotDate}:${metricId}`,
    brandId: input.brandId,
    storeId: input.storeId,
    snapshotDate: input.snapshotDate,
    definition,
    numeratorValue,
    denominatorValue,
    value: denominatorValue === 0 ? null : roundMetric(numeratorValue / denominatorValue),
    evidenceRefs,
  };
}

function metricDefinition(metricId: SnapshotMetricId): MetricDefinition {
  switch (metricId) {
    case "repurchase_90d_rate":
      return {
        metricId,
        label: "90-day repurchase rate",
        numerator: "Members in member_rfm_snapshots with payCnt90d >= 2",
        denominator: "Members in member_rfm_snapshots with payCnt90d >= 1",
        window: "90d",
        owner: "data-dyna-core",
        source: ["member_rfm_snapshots"],
        projectionInputRefs: ["BusinessProjections.memberRfmSnapshots"],
        guardrailRelation: "growth_metric",
      };
    case "avg_order_value":
      return {
        metricId,
        label: "Average paid order value",
        numerator: "Sum of POS-paid order totalAmount",
        denominator: "Count of POS-paid orders",
        window: "snapshot",
        owner: "data-dyna-core",
        source: ["orders"],
        projectionInputRefs: ["BusinessProjections.orders"],
        guardrailRelation: "growth_metric",
      };
    case "refund_rate":
      return {
        metricId,
        label: "Refund rate",
        numerator: "Count of POS refund records",
        denominator: "Count of POS-paid orders",
        window: "snapshot",
        owner: "data-dyna-core",
        source: ["refunds", "orders"],
        projectionInputRefs: ["BusinessProjections.refunds", "BusinessProjections.orders"],
        guardrailRelation: "negative_guardrail",
      };
    case "checkout_started_cart_rate":
      return {
        metricId,
        label: "Checkout-started cart rate",
        numerator: "Carts with status checkout_started",
        denominator: "All observed carts",
        window: "snapshot",
        owner: "data-dyna-core",
        source: ["carts"],
        projectionInputRefs: ["BusinessProjections.carts"],
        guardrailRelation: "funnel_metric",
      };
  }
}

function independentCafeConfidence(projections: BusinessProjections, brandId: string, storeId: string): number {
  const storeItems = projections.items.filter((item) => belongsToStore(item, brandId, storeId));
  const storeMenus = projections.menus.filter((menu) => belongsToStore(menu, brandId, storeId));
  const coffeeEvidence = storeItems.some((item) => containsCafeSignal(item.category) || containsCafeSignal(item.itemName));
  const menuEvidence = storeMenus.some((menu) => containsCafeSignal(menu.menuName));
  if (coffeeEvidence && menuEvidence) return 0.9;
  if (coffeeEvidence) return 0.8;
  if (menuEvidence) return 0.7;
  return 0.55;
}

function containsCafeSignal(value?: string): boolean {
  if (!value) return false;
  return /coffee|cafe|latte|americano|espresso|咖啡|拿铁/.test(value.toLowerCase());
}

function belongsToStore(row: { brandId?: string; storeId?: string }, brandId: string, storeId: string): boolean {
  return row.brandId === brandId && row.storeId === storeId;
}

function sourceRefs<T>(rows: T[], table: string, idOf: (row: T) => string): string[] {
  return uniqueSorted(rows.map((row) => `${table}:${idOf(row)}`));
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort(compareStrings);
}

function roundMetric(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right);
}
