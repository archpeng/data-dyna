import type { JsonValue } from "../contracts/event-contract.ts";
import type { RawEventRecord } from "../ingestion/raw-event-store.ts";
import {
  DATAMESH_MEMBER_LABELS_SOURCE_TABLE,
  type DatameshMemberLabelsRow,
  toMemberRfmSnapshotInput,
} from "../datamesh/rfm-member-labels.ts";

export type ProjectionRun = {
  projectionName: "business_projections.v1";
  rebuiltAt: string;
  sourceEventCount: number;
  sourceRfmRowCount: number;
};

export type SessionProjection = {
  sessionId: string;
  brandId?: string;
  storeId?: string;
  memberId?: string;
  firstEventAt: string;
  lastEventAt: string;
  sourceEventIds: string[];
};

export type CartProjection = {
  cartId: string;
  brandId?: string;
  storeId?: string;
  memberId?: string;
  sessionId?: string;
  status: "updated" | "checkout_started";
  checkoutStartedAt?: string;
  frontendAttributionEventIds: string[];
  sourceEventIds: string[];
};

export type OrderProjection = {
  orderId: string;
  brandId?: string;
  storeId?: string;
  memberId?: string;
  status: "opened" | "paid" | "refunded";
  openedAt?: string;
  paidAt?: string;
  totalAmount?: number;
  currency?: string;
  finalFactSource: "pos";
  sourceEventIds: string[];
  frontendAttributionEventIds: string[];
};

export type OrderItemProjection = {
  orderItemId: string;
  orderId: string;
  itemId: string;
  itemName?: string;
  quantity: number;
  amount?: number;
  sourceEventId: string;
};

export type PaymentProjection = {
  paymentId: string;
  orderId: string;
  brandId?: string;
  storeId?: string;
  amount: number;
  method?: string;
  paidAt: string;
  finalFactSource: "pos";
  sourceEventId: string;
};

export type RefundProjection = {
  refundId: string;
  orderId: string;
  brandId?: string;
  storeId?: string;
  amount: number;
  reason?: string;
  refundedAt: string;
  finalFactSource: "pos";
  sourceEventId: string;
};

export type ItemProjection = {
  itemId: string;
  brandId?: string;
  storeId?: string;
  menuId?: string;
  itemName?: string;
  category?: string;
  sourceEventIds: string[];
};

export type MenuProjection = {
  menuId: string;
  brandId?: string;
  storeId?: string;
  menuName?: string;
  sourceEventIds: string[];
};

export type MemberProjection = {
  memberId: string;
  brandId?: string;
  storeId?: string;
  firstSeenAt: string;
  lastSeenAt: string;
  sourceEventIds: string[];
};

export type MemberProfileProjection = {
  memberId: string;
  brandId?: string;
  storeId?: string;
  latestOrderId?: string;
  latestPayTime?: string;
  sourceEventIds: string[];
};

export type MemberRfmSnapshotProjection = {
  memberId: string;
  brandId: string;
  storeId?: string;
  snapshotDate: string;
  sourceTable: typeof DATAMESH_MEMBER_LABELS_SOURCE_TABLE;
  rfmTag30d: string;
  rfmTag90d: string;
  rfmTag180d: string;
  latestPayTime?: string;
  payCnt90d: number;
  payAmount90d: number;
  avgPayAmount90d: number;
};

export type MerchantActionProjection = {
  actionId: string;
  experimentPlanId: string;
  brandId?: string;
  storeId?: string;
  merchantId?: string;
  action: "review_viewed" | "accepted" | "rejected";
  actedAt: string;
  sourceEventId: string;
};

export type BusinessProjections = {
  run: ProjectionRun;
  sessions: SessionProjection[];
  carts: CartProjection[];
  orders: OrderProjection[];
  orderItems: OrderItemProjection[];
  payments: PaymentProjection[];
  refunds: RefundProjection[];
  items: ItemProjection[];
  menus: MenuProjection[];
  members: MemberProjection[];
  memberProfiles: MemberProfileProjection[];
  memberRfmSnapshots: MemberRfmSnapshotProjection[];
  merchantActions: MerchantActionProjection[];
};

export type ProjectionRebuildInput = {
  rawEvents: RawEventRecord[];
  rfmRows?: DatameshMemberLabelsRow[];
  rebuiltAt?: string;
};

export interface ProjectionStore {
  replaceAll(projections: BusinessProjections): Promise<void>;
  current(): Promise<BusinessProjections | undefined>;
}

export class InMemoryProjectionStore implements ProjectionStore {
  private latest?: BusinessProjections;

  async replaceAll(projections: BusinessProjections): Promise<void> {
    this.latest = projections;
  }

  async current(): Promise<BusinessProjections | undefined> {
    return this.latest;
  }
}

export async function runProjectionRebuildTask(
  input: ProjectionRebuildInput,
  store: ProjectionStore,
): Promise<BusinessProjections> {
  const projections = rebuildBusinessProjections(input);
  await store.replaceAll(projections);
  return projections;
}

export function rebuildBusinessProjections(input: ProjectionRebuildInput): BusinessProjections {
  const sortedEvents = [...input.rawEvents].sort(compareRawEvents);
  const rebuiltAt = input.rebuiltAt ?? new Date(0).toISOString();
  const sessions = new Map<string, SessionProjection>();
  const carts = new Map<string, CartProjection>();
  const orders = new Map<string, OrderProjection>();
  const orderItems = new Map<string, OrderItemProjection>();
  const payments = new Map<string, PaymentProjection>();
  const refunds = new Map<string, RefundProjection>();
  const items = new Map<string, ItemProjection>();
  const menus = new Map<string, MenuProjection>();
  const members = new Map<string, MemberProjection>();
  const memberProfiles = new Map<string, MemberProfileProjection>();
  const merchantActions = new Map<string, MerchantActionProjection>();
  const frontendOrderAttribution = new Map<string, string[]>();

  for (const rawEvent of sortedEvents) {
    projectSession(rawEvent, sessions);
    projectMember(rawEvent, members, memberProfiles);
    projectMenuItem(rawEvent, items, menus);

    if (rawEvent.name === "mini_program.cart_updated") {
      projectCart(rawEvent, carts, items, menus);
    }

    if (rawEvent.name === "mini_program.checkout_started") {
      projectCheckoutAttribution(rawEvent, carts, frontendOrderAttribution);
    }

    if (rawEvent.name === "pos.order_opened" || rawEvent.name === "pos.order_paid") {
      projectOrder(rawEvent, orders, orderItems, payments, memberProfiles);
    }

    if (rawEvent.name === "pos.refund_recorded") {
      projectRefund(rawEvent, orders, refunds);
    }

    if (
      rawEvent.name === "mobile_hq.experiment_review_viewed" ||
      rawEvent.name === "mobile_hq.experiment_accepted" ||
      rawEvent.name === "mobile_hq.experiment_rejected"
    ) {
      projectMerchantAction(rawEvent, merchantActions);
    }
  }

  for (const [orderId, eventIds] of frontendOrderAttribution) {
    const order = orders.get(orderId);
    if (order) {
      order.frontendAttributionEventIds = uniqueSorted([...order.frontendAttributionEventIds, ...eventIds]);
    }
  }

  const memberRfmSnapshots = (input.rfmRows ?? [])
    .map(toMemberRfmSnapshotInput)
    .sort((a, b) => compareStrings(`${a.brandId}:${a.memberId}:${a.snapshotDate}`, `${b.brandId}:${b.memberId}:${b.snapshotDate}`));

  for (const snapshot of memberRfmSnapshots) {
    const snapshotObservedAt = `${snapshot.snapshotDate}T00:00:00.000Z`;
    const existingMember = members.get(snapshot.memberId);
    members.set(snapshot.memberId, {
      memberId: snapshot.memberId,
      brandId: existingMember?.brandId ?? snapshot.brandId,
      storeId: existingMember?.storeId ?? snapshot.storeId,
      firstSeenAt: minDate(existingMember?.firstSeenAt, snapshotObservedAt),
      lastSeenAt: maxDate(existingMember?.lastSeenAt, snapshotObservedAt),
      sourceEventIds: existingMember?.sourceEventIds ?? [],
    });

    const existing = memberProfiles.get(snapshot.memberId);
    memberProfiles.set(snapshot.memberId, {
      memberId: snapshot.memberId,
      brandId: existing?.brandId ?? snapshot.brandId,
      storeId: existing?.storeId ?? snapshot.storeId,
      latestOrderId: existing?.latestOrderId,
      latestPayTime: maxOptionalDate(existing?.latestPayTime, snapshot.latestPayTime),
      sourceEventIds: existing?.sourceEventIds ?? [],
    });
  }

  return {
    run: {
      projectionName: "business_projections.v1",
      rebuiltAt,
      sourceEventCount: sortedEvents.length,
      sourceRfmRowCount: input.rfmRows?.length ?? 0,
    },
    sessions: sortBy(sessions.values(), (row) => row.sessionId),
    carts: sortBy(carts.values(), (row) => row.cartId),
    orders: sortBy(orders.values(), (row) => row.orderId),
    orderItems: sortBy(orderItems.values(), (row) => row.orderItemId),
    payments: sortBy(payments.values(), (row) => row.paymentId),
    refunds: sortBy(refunds.values(), (row) => row.refundId),
    items: sortBy(items.values(), (row) => row.itemId),
    menus: sortBy(menus.values(), (row) => row.menuId),
    members: sortBy(members.values(), (row) => row.memberId),
    memberProfiles: sortBy(memberProfiles.values(), (row) => row.memberId),
    memberRfmSnapshots,
    merchantActions: sortBy(merchantActions.values(), (row) => row.actionId),
  };
}

function projectSession(rawEvent: RawEventRecord, sessions: Map<string, SessionProjection>): void {
  const sessionId = rawEvent.event.correlation.sessionId;
  if (!sessionId) return;

  const existing = sessions.get(sessionId);
  sessions.set(sessionId, {
    sessionId,
    brandId: existing?.brandId ?? rawEvent.brandId,
    storeId: existing?.storeId ?? rawEvent.storeId,
    memberId: existing?.memberId ?? rawEvent.event.identity.memberId,
    firstEventAt: minDate(existing?.firstEventAt, rawEvent.occurredAt),
    lastEventAt: maxDate(existing?.lastEventAt, rawEvent.occurredAt),
    sourceEventIds: uniqueSorted([...(existing?.sourceEventIds ?? []), rawEvent.eventId]),
  });
}

function projectMember(
  rawEvent: RawEventRecord,
  members: Map<string, MemberProjection>,
  memberProfiles: Map<string, MemberProfileProjection>,
): void {
  const memberId = rawEvent.event.identity.memberId;
  if (!memberId) return;

  const existingMember = members.get(memberId);
  members.set(memberId, {
    memberId,
    brandId: existingMember?.brandId ?? rawEvent.brandId,
    storeId: existingMember?.storeId ?? rawEvent.storeId,
    firstSeenAt: minDate(existingMember?.firstSeenAt, rawEvent.occurredAt),
    lastSeenAt: maxDate(existingMember?.lastSeenAt, rawEvent.occurredAt),
    sourceEventIds: uniqueSorted([...(existingMember?.sourceEventIds ?? []), rawEvent.eventId]),
  });

  const existingProfile = memberProfiles.get(memberId);
  memberProfiles.set(memberId, {
    memberId,
    brandId: existingProfile?.brandId ?? rawEvent.brandId,
    storeId: existingProfile?.storeId ?? rawEvent.storeId,
    latestOrderId: existingProfile?.latestOrderId,
    latestPayTime: existingProfile?.latestPayTime,
    sourceEventIds: uniqueSorted([...(existingProfile?.sourceEventIds ?? []), rawEvent.eventId]),
  });
}

function projectMenuItem(
  rawEvent: RawEventRecord,
  items: Map<string, ItemProjection>,
  menus: Map<string, MenuProjection>,
): void {
  if (rawEvent.entityType !== "menu_item" && rawEvent.name !== "mini_program.cart_updated" && !getItems(rawEvent).length) {
    return;
  }

  const menuId = getString(rawEvent.properties.menuId);
  if (menuId) {
    upsertMenu(rawEvent, menus, menuId);
  }

  const directItemId = rawEvent.entityType === "menu_item" ? rawEvent.entityId : getString(rawEvent.properties.itemId);
  if (directItemId) {
    upsertItem(rawEvent, items, directItemId, menuId);
  }

  for (const item of getItems(rawEvent)) {
    const itemMenuId = getString(item.menuId) ?? menuId;
    if (itemMenuId) {
      upsertMenu(rawEvent, menus, itemMenuId, getString(item.menuName));
    }

    const itemId = getString(item.itemId);
    if (itemId) {
      upsertItem(rawEvent, items, itemId, itemMenuId, getString(item.itemName), getString(item.category));
    }
  }
}

function projectCart(
  rawEvent: RawEventRecord,
  carts: Map<string, CartProjection>,
  items: Map<string, ItemProjection>,
  menus: Map<string, MenuProjection>,
): void {
  const cartId = rawEvent.entityType === "cart" ? rawEvent.entityId : getString(rawEvent.properties.cartId);
  if (!cartId) return;

  const existing = carts.get(cartId);
  carts.set(cartId, {
    cartId,
    brandId: existing?.brandId ?? rawEvent.brandId,
    storeId: existing?.storeId ?? rawEvent.storeId,
    memberId: existing?.memberId ?? rawEvent.event.identity.memberId,
    sessionId: existing?.sessionId ?? rawEvent.event.correlation.sessionId,
    status: "updated",
    checkoutStartedAt: existing?.checkoutStartedAt,
    frontendAttributionEventIds: existing?.frontendAttributionEventIds ?? [],
    sourceEventIds: uniqueSorted([...(existing?.sourceEventIds ?? []), rawEvent.eventId]),
  });

  for (const item of getItems(rawEvent)) {
    const itemId = getString(item.itemId);
    if (itemId) {
      upsertItem(rawEvent, items, itemId, getString(item.menuId), getString(item.itemName), getString(item.category));
      const menuId = getString(item.menuId);
      if (menuId) upsertMenu(rawEvent, menus, menuId, getString(item.menuName));
    }
  }
}

function projectCheckoutAttribution(
  rawEvent: RawEventRecord,
  carts: Map<string, CartProjection>,
  frontendOrderAttribution: Map<string, string[]>,
): void {
  const cartId = getString(rawEvent.properties.cartId);
  if (cartId) {
    const existing = carts.get(cartId);
    carts.set(cartId, {
      cartId,
      brandId: existing?.brandId ?? rawEvent.brandId,
      storeId: existing?.storeId ?? rawEvent.storeId,
      memberId: existing?.memberId ?? rawEvent.event.identity.memberId,
      sessionId: existing?.sessionId ?? rawEvent.event.correlation.sessionId,
      status: "checkout_started",
      checkoutStartedAt: rawEvent.occurredAt,
      frontendAttributionEventIds: uniqueSorted([...(existing?.frontendAttributionEventIds ?? []), rawEvent.eventId]),
      sourceEventIds: uniqueSorted([...(existing?.sourceEventIds ?? []), rawEvent.eventId]),
    });
  }

  const orderId = getString(rawEvent.properties.orderId) ?? getString(rawEvent.properties.posOrderId);
  if (orderId) {
    frontendOrderAttribution.set(orderId, uniqueSorted([...(frontendOrderAttribution.get(orderId) ?? []), rawEvent.eventId]));
  }
}

function projectOrder(
  rawEvent: RawEventRecord,
  orders: Map<string, OrderProjection>,
  orderItems: Map<string, OrderItemProjection>,
  payments: Map<string, PaymentProjection>,
  memberProfiles: Map<string, MemberProfileProjection>,
): void {
  const orderId = rawEvent.entityType === "order" ? rawEvent.entityId : getString(rawEvent.properties.orderId);
  if (!orderId) return;

  const existing = orders.get(orderId);
  const totalAmount = getNumber(rawEvent.properties.totalAmount) ?? getNumber(rawEvent.properties.amount) ?? existing?.totalAmount;
  const currency = getString(rawEvent.properties.currency) ?? existing?.currency;
  const isPaid = rawEvent.name === "pos.order_paid";
  orders.set(orderId, {
    orderId,
    brandId: existing?.brandId ?? rawEvent.brandId,
    storeId: existing?.storeId ?? rawEvent.storeId,
    memberId: existing?.memberId ?? rawEvent.event.identity.memberId,
    status: isPaid ? "paid" : existing?.status ?? "opened",
    openedAt: existing?.openedAt ?? (rawEvent.name === "pos.order_opened" ? rawEvent.occurredAt : undefined),
    paidAt: isPaid ? rawEvent.occurredAt : existing?.paidAt,
    totalAmount,
    currency,
    finalFactSource: "pos",
    sourceEventIds: uniqueSorted([...(existing?.sourceEventIds ?? []), rawEvent.eventId]),
    frontendAttributionEventIds: existing?.frontendAttributionEventIds ?? [],
  });

  for (const item of getItems(rawEvent)) {
    const itemId = getString(item.itemId);
    if (!itemId) continue;
    const orderItemId = getString(item.orderItemId) ?? `${orderId}:${itemId}`;
    orderItems.set(orderItemId, {
      orderItemId,
      orderId,
      itemId,
      itemName: getString(item.itemName),
      quantity: getNumber(item.quantity) ?? 1,
      amount: getNumber(item.amount),
      sourceEventId: rawEvent.eventId,
    });
  }

  if (isPaid && totalAmount !== undefined) {
    const paymentId = getString(rawEvent.properties.paymentId) ?? `${orderId}:payment`;
    payments.set(paymentId, {
      paymentId,
      orderId,
      brandId: rawEvent.brandId,
      storeId: rawEvent.storeId,
      amount: totalAmount,
      method: getString(rawEvent.properties.paymentMethod),
      paidAt: rawEvent.occurredAt,
      finalFactSource: "pos",
      sourceEventId: rawEvent.eventId,
    });
  }

  const memberId = rawEvent.event.identity.memberId;
  if (memberId && isPaid) {
    const existingProfile = memberProfiles.get(memberId);
    memberProfiles.set(memberId, {
      memberId,
      brandId: existingProfile?.brandId ?? rawEvent.brandId,
      storeId: existingProfile?.storeId ?? rawEvent.storeId,
      latestOrderId: orderId,
      latestPayTime: maxOptionalDate(existingProfile?.latestPayTime, rawEvent.occurredAt),
      sourceEventIds: uniqueSorted([...(existingProfile?.sourceEventIds ?? []), rawEvent.eventId]),
    });
  }
}

function projectRefund(
  rawEvent: RawEventRecord,
  orders: Map<string, OrderProjection>,
  refunds: Map<string, RefundProjection>,
): void {
  const orderId = getString(rawEvent.properties.orderId);
  const refundId = rawEvent.entityType === "refund" ? rawEvent.entityId : getString(rawEvent.properties.refundId);
  const amount = getNumber(rawEvent.properties.amount);
  if (!orderId || !refundId || amount === undefined) return;

  refunds.set(refundId, {
    refundId,
    orderId,
    brandId: rawEvent.brandId,
    storeId: rawEvent.storeId,
    amount,
    reason: getString(rawEvent.properties.reason),
    refundedAt: rawEvent.occurredAt,
    finalFactSource: "pos",
    sourceEventId: rawEvent.eventId,
  });

  const existing = orders.get(orderId);
  if (existing) {
    orders.set(orderId, { ...existing, status: "refunded", sourceEventIds: uniqueSorted([...existing.sourceEventIds, rawEvent.eventId]) });
  }
}

function projectMerchantAction(rawEvent: RawEventRecord, merchantActions: Map<string, MerchantActionProjection>): void {
  const experimentPlanId = rawEvent.entityType === "experiment_plan" ? rawEvent.entityId : getString(rawEvent.properties.experimentPlanId);
  if (!experimentPlanId) return;

  const action = rawEvent.name === "mobile_hq.experiment_accepted" ? "accepted" : rawEvent.name === "mobile_hq.experiment_rejected" ? "rejected" : "review_viewed";
  const actionId = `${experimentPlanId}:${action}:${rawEvent.eventId}`;
  merchantActions.set(actionId, {
    actionId,
    experimentPlanId,
    brandId: rawEvent.brandId,
    storeId: rawEvent.storeId,
    merchantId: rawEvent.event.identity.merchantId,
    action,
    actedAt: rawEvent.occurredAt,
    sourceEventId: rawEvent.eventId,
  });
}

function upsertMenu(rawEvent: RawEventRecord, menus: Map<string, MenuProjection>, menuId: string, menuName = getString(rawEvent.properties.menuName)): void {
  const existing = menus.get(menuId);
  menus.set(menuId, {
    menuId,
    brandId: existing?.brandId ?? rawEvent.brandId,
    storeId: existing?.storeId ?? rawEvent.storeId,
    menuName: existing?.menuName ?? menuName,
    sourceEventIds: uniqueSorted([...(existing?.sourceEventIds ?? []), rawEvent.eventId]),
  });
}

function upsertItem(
  rawEvent: RawEventRecord,
  items: Map<string, ItemProjection>,
  itemId: string,
  menuId?: string,
  itemName = getString(rawEvent.properties.itemName),
  category = getString(rawEvent.properties.category),
): void {
  const existing = items.get(itemId);
  items.set(itemId, {
    itemId,
    brandId: existing?.brandId ?? rawEvent.brandId,
    storeId: existing?.storeId ?? rawEvent.storeId,
    menuId: existing?.menuId ?? menuId,
    itemName: existing?.itemName ?? itemName,
    category: existing?.category ?? category,
    sourceEventIds: uniqueSorted([...(existing?.sourceEventIds ?? []), rawEvent.eventId]),
  });
}

function getItems(rawEvent: RawEventRecord): Array<Record<string, JsonValue>> {
  const items = rawEvent.properties.items;
  if (!Array.isArray(items)) return [];
  return items.filter((item): item is Record<string, JsonValue> => typeof item === "object" && item !== null && !Array.isArray(item));
}

function getString(value: JsonValue | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getNumber(value: JsonValue | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function minDate(left: string | undefined, right: string): string {
  return !left || right < left ? right : left;
}

function maxDate(left: string | undefined, right: string): string {
  return !left || right > left ? right : left;
}

function maxOptionalDate(left?: string, right?: string): string | undefined {
  if (!right) return left;
  if (!left) return right;
  return right > left ? right : left;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort(compareStrings);
}

function compareRawEvents(left: RawEventRecord, right: RawEventRecord): number {
  return compareStrings(`${left.occurredAt}:${left.eventId}`, `${right.occurredAt}:${right.eventId}`);
}

function sortBy<T>(values: Iterable<T>, keyOf: (value: T) => string): T[] {
  return [...values].sort((left, right) => compareStrings(keyOf(left), keyOf(right)));
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right);
}
