import { z } from "zod";
import { parseDataDynaEvent, type DataDynaEvent } from "../../contracts/event-contract.ts";

export const PosOrderPaidFixtureSchema = z
  .object({
    schemaVersion: z.literal("pos.order-paid.v1"),
    source: z.literal("pos"),
    merchantId: z.string().min(1),
    storeId: z.string().min(1),
    brandId: z.string().min(1).optional(),
    orderId: z.string().min(1),
    paymentId: z.string().min(1),
    orderVersion: z.string().min(1),
    paidAt: z.string().datetime({ offset: true }),
    emittedAt: z.string().datetime({ offset: true }),
    producer: z
      .object({
        service: z.literal("pos-lite-cashier"),
        app: z.literal("pos-register"),
        environment: z.literal("test"),
      })
      .strict(),
    cashierActorType: z.literal("cashier"),
    orderChannel: z.literal("in_store_pos"),
    paymentStatus: z.literal("paid"),
    paymentMethodType: z.enum(["card_present", "cash", "stored_value", "other"]),
    currency: z.string().regex(/^[A-Z]{3}$/),
    lineItemCount: z.number().int().nonnegative(),
  })
  .strict();

export type PosOrderPaidFixture = z.infer<typeof PosOrderPaidFixtureSchema>;

export function mapPosOrderPaidToDataDynaEvent(input: unknown): DataDynaEvent {
  const fixture = PosOrderPaidFixtureSchema.parse(input);

  return parseDataDynaEvent({
    version: "event-contract.v1",
    source: "pos",
    domain: "transaction_scene",
    name: "pos.order_paid",
    occurredAt: fixture.paidAt,
    producer: {
      service: fixture.producer.service,
      app: fixture.producer.app,
      environment: fixture.producer.environment,
      emittedAt: fixture.emittedAt,
      schemaRef: `${fixture.schemaVersion} -> data-dyna.event-contract.v1`,
    },
    identity: {
      ...(fixture.brandId ? { brandId: fixture.brandId } : {}),
      merchantId: fixture.merchantId,
      storeId: fixture.storeId,
      actorType: fixture.cashierActorType,
    },
    correlation: {
      eventId: `pos.order_paid:${fixture.storeId}:${fixture.orderId}:${fixture.paymentId}`,
      correlationId: `pos-order:${fixture.orderId}`,
    },
    entity: {
      type: "order",
      id: fixture.orderId,
      version: fixture.orderVersion,
    },
    properties: {
      orderStatus: "paid",
      paymentStatus: fixture.paymentStatus,
      orderChannel: fixture.orderChannel,
      paymentMethodType: fixture.paymentMethodType,
      currency: fixture.currency,
      lineItemCount: fixture.lineItemCount,
    },
    idempotency: {
      scope: "store",
      key: `pos.order_paid:v1:${fixture.orderId}:${fixture.paymentId}`,
    },
  });
}
