import { z } from "zod";

export const EventContractVersionSchema = z.literal("event-contract.v1");

export const EventSourceSchema = z.enum([
  "mini_program",
  "pos",
  "mobile_hq",
  "datamesh",
  "system",
]);

export const EventDomainSchema = z.enum([
  "user_behavior",
  "transaction_scene",
  "merchant_action",
  "external_fact_snapshot",
  "system_fact",
]);

export const EventNameSchema = z.enum([
  "mini_program.menu_item_viewed",
  "mini_program.cart_updated",
  "mini_program.checkout_started",
  "pos.order_opened",
  "pos.order_paid",
  "pos.refund_recorded",
  "mobile_hq.experiment_review_submitted",
  "mobile_hq.experiment_review_viewed",
  "mobile_hq.experiment_accepted",
  "mobile_hq.experiment_modified",
  "mobile_hq.experiment_rejected",
  "mobile_hq.experiment_applied_recorded",
  "mobile_hq.experiment_reverted_recorded",
  "mobile_hq.merchant_preference_confirmed",
  "datamesh.member_rfm_snapshot_imported",
  "system.projection_rebuilt",
]);

export const ProducerSchema = z.object({
  service: z.string().min(1),
  app: z.string().min(1).optional(),
  environment: z.enum(["local", "dev", "test", "staging", "prod"]).optional(),
  emittedAt: z.string().datetime({ offset: true }),
  schemaRef: z.string().min(1).optional(),
});

export const IdentitySchema = z.object({
  brandId: z.string().min(1).optional(),
  storeId: z.string().min(1).optional(),
  merchantId: z.string().min(1).optional(),
  memberId: z.string().min(1).optional(),
  customerId: z.string().min(1).optional(),
  deviceId: z.string().min(1).optional(),
  actorType: z
    .enum(["customer", "cashier", "merchant", "system", "datamesh"])
    .optional(),
});

export const CorrelationSchema = z.object({
  eventId: z.string().min(1),
  traceId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  requestId: z.string().min(1).optional(),
  causationId: z.string().min(1).optional(),
  correlationId: z.string().min(1).optional(),
});

export const EntitySchema = z.object({
  type: z.enum([
    "store",
    "member",
    "cart",
    "order",
    "order_item",
    "payment",
    "refund",
    "menu_item",
    "experiment_plan",
    "experiment_review",
    "merchant_preference",
    "rfm_snapshot",
    "projection",
  ]),
  id: z.string().min(1),
  version: z.string().min(1).optional(),
});

const JsonLiteralSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export type JsonLiteral = z.infer<typeof JsonLiteralSchema>;
export type JsonValue = JsonLiteral | { [key: string]: JsonValue } | JsonValue[];
export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([JsonLiteralSchema, z.array(JsonValueSchema), z.record(z.string(), JsonValueSchema)]),
);

export const IdempotencySchema = z.object({
  key: z.string().min(1),
  scope: z.enum(["producer", "store", "brand", "global"]),
});

export const DataDynaEventSchema = z.object({
  version: EventContractVersionSchema,
  source: EventSourceSchema,
  domain: EventDomainSchema,
  name: EventNameSchema,
  occurredAt: z.string().datetime({ offset: true }),
  producer: ProducerSchema,
  identity: IdentitySchema,
  correlation: CorrelationSchema,
  entity: EntitySchema,
  properties: z.record(z.string(), JsonValueSchema).default({}),
  idempotency: IdempotencySchema,
});

export type EventContractVersion = z.infer<typeof EventContractVersionSchema>;
export type EventSource = z.infer<typeof EventSourceSchema>;
export type EventDomain = z.infer<typeof EventDomainSchema>;
export type EventName = z.infer<typeof EventNameSchema>;
export type DataDynaEvent = z.infer<typeof DataDynaEventSchema>;

export function parseDataDynaEvent(input: unknown): DataDynaEvent {
  return DataDynaEventSchema.parse(input);
}
