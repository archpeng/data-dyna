import type { DataDynaEvent, JsonValue } from "../contracts/event-contract.ts";

export type RawEventRecord = {
  eventId: string;
  idempotencyKey: string;
  contractVersion: DataDynaEvent["version"];
  source: DataDynaEvent["source"];
  domain: DataDynaEvent["domain"];
  name: DataDynaEvent["name"];
  occurredAt: string;
  receivedAt: string;
  producerService: string;
  brandId?: string;
  storeId?: string;
  entityType: DataDynaEvent["entity"]["type"];
  entityId: string;
  properties: Record<string, JsonValue>;
  event: DataDynaEvent;
};

export type InvalidRawEventRecord = {
  receivedAt: string;
  reason: string;
  payload: unknown;
};

export type PersistAcceptedResult = {
  record: RawEventRecord;
  duplicate: boolean;
};

export interface RawEventStore {
  persistAccepted(event: DataDynaEvent): Promise<PersistAcceptedResult>;
  persistInvalid(payload: unknown, reason: string): Promise<InvalidRawEventRecord>;
}

export class InMemoryRawEventStore implements RawEventStore {
  private readonly acceptedByIdempotencyKey = new Map<string, RawEventRecord>();
  private readonly invalidEvents: InvalidRawEventRecord[] = [];

  async persistAccepted(event: DataDynaEvent): Promise<PersistAcceptedResult> {
    const existing = this.acceptedByIdempotencyKey.get(event.idempotency.key);
    if (existing) {
      return { record: existing, duplicate: true };
    }

    const record: RawEventRecord = {
      eventId: event.correlation.eventId,
      idempotencyKey: event.idempotency.key,
      contractVersion: event.version,
      source: event.source,
      domain: event.domain,
      name: event.name,
      occurredAt: event.occurredAt,
      receivedAt: new Date().toISOString(),
      producerService: event.producer.service,
      brandId: event.identity.brandId,
      storeId: event.identity.storeId,
      entityType: event.entity.type,
      entityId: event.entity.id,
      properties: event.properties,
      event,
    };

    this.acceptedByIdempotencyKey.set(event.idempotency.key, record);
    return { record, duplicate: false };
  }

  async persistInvalid(payload: unknown, reason: string): Promise<InvalidRawEventRecord> {
    const record = {
      receivedAt: new Date().toISOString(),
      reason,
      payload,
    };
    this.invalidEvents.push(record);
    return record;
  }

  accepted(): RawEventRecord[] {
    return [...this.acceptedByIdempotencyKey.values()];
  }

  invalid(): InvalidRawEventRecord[] {
    return [...this.invalidEvents];
  }
}
