import type { DataDynaEvent, JsonValue } from "../contracts/event-contract.ts";

export type RawEventPersistenceContext = {
  credentialId?: string;
};

export type InvalidRawEventAuditContext = {
  credentialId?: string;
  merchantId?: string;
  storeId?: string;
  producerService?: string;
  producerEnvironment?: string;
  source?: string;
  reasonCode?: string;
};

export type RawEventRecord = {
  eventId: string;
  idempotencyKey: string;
  idempotencyScope: DataDynaEvent["idempotency"]["scope"];
  contractVersion: DataDynaEvent["version"];
  source: DataDynaEvent["source"];
  domain: DataDynaEvent["domain"];
  name: DataDynaEvent["name"];
  occurredAt: string;
  receivedAt: string;
  producerService: string;
  producerEnvironment?: DataDynaEvent["producer"]["environment"];
  credentialId?: string;
  brandId?: string;
  merchantId?: string;
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
  credentialId?: string;
  merchantId?: string;
  storeId?: string;
  producerService?: string;
  producerEnvironment?: string;
  source?: string;
  reasonCode?: string;
};

export type PersistAcceptedResult = {
  record: RawEventRecord;
  duplicate: boolean;
};

export interface RawEventStore {
  persistAccepted(event: DataDynaEvent, context?: RawEventPersistenceContext): Promise<PersistAcceptedResult>;
  persistInvalid(
    payload: unknown,
    reason: string,
    auditContext?: InvalidRawEventAuditContext,
  ): Promise<InvalidRawEventRecord>;
}

export class InMemoryRawEventStore implements RawEventStore {
  private readonly acceptedByIdempotencyIdentity = new Map<string, RawEventRecord>();
  private readonly acceptedByEventId = new Map<string, RawEventRecord>();
  private readonly invalidEvents: InvalidRawEventRecord[] = [];

  async persistAccepted(
    event: DataDynaEvent,
    context: RawEventPersistenceContext = {},
  ): Promise<PersistAcceptedResult> {
    const idempotencyIdentity = rawEventIdempotencyIdentity(event);
    const existingByEventId = this.acceptedByEventId.get(event.correlation.eventId);
    if (existingByEventId) {
      if (recordMatchesTenantIdempotency(existingByEventId, event)) {
        return { record: existingByEventId, duplicate: true };
      }

      throw new Error(
        `Raw event event_id ${event.correlation.eventId} already exists for a different tenant idempotency identity.`,
      );
    }

    const existingByIdempotency = this.acceptedByIdempotencyIdentity.get(idempotencyIdentity);
    if (existingByIdempotency) {
      return { record: existingByIdempotency, duplicate: true };
    }

    const record: RawEventRecord = {
      eventId: event.correlation.eventId,
      idempotencyKey: event.idempotency.key,
      idempotencyScope: event.idempotency.scope,
      contractVersion: event.version,
      source: event.source,
      domain: event.domain,
      name: event.name,
      occurredAt: event.occurredAt,
      receivedAt: new Date().toISOString(),
      producerService: event.producer.service,
      producerEnvironment: event.producer.environment,
      credentialId: context.credentialId,
      brandId: event.identity.brandId,
      merchantId: event.identity.merchantId,
      storeId: event.identity.storeId,
      entityType: event.entity.type,
      entityId: event.entity.id,
      properties: event.properties,
      event,
    };

    this.acceptedByIdempotencyIdentity.set(idempotencyIdentity, record);
    this.acceptedByEventId.set(event.correlation.eventId, record);
    return { record, duplicate: false };
  }

  async persistInvalid(
    payload: unknown,
    reason: string,
    auditContext: InvalidRawEventAuditContext = {},
  ): Promise<InvalidRawEventRecord> {
    const record = {
      receivedAt: new Date().toISOString(),
      reason,
      payload,
      credentialId: auditContext.credentialId,
      merchantId: auditContext.merchantId,
      storeId: auditContext.storeId,
      producerService: auditContext.producerService,
      producerEnvironment: auditContext.producerEnvironment,
      source: auditContext.source,
      reasonCode: auditContext.reasonCode,
    };
    this.invalidEvents.push(record);
    return record;
  }

  accepted(): RawEventRecord[] {
    return [...this.acceptedByIdempotencyIdentity.values()];
  }

  invalid(): InvalidRawEventRecord[] {
    return [...this.invalidEvents];
  }
}

function rawEventIdempotencyIdentity(event: DataDynaEvent): string {
  return JSON.stringify([
    event.identity.merchantId ?? "",
    event.identity.storeId ?? "",
    event.producer.service,
    event.producer.environment ?? "",
    event.source,
    event.idempotency.scope,
    event.idempotency.key,
  ]);
}

function recordMatchesTenantIdempotency(record: RawEventRecord, event: DataDynaEvent): boolean {
  return (
    (record.merchantId ?? "") === (event.identity.merchantId ?? "") &&
    (record.storeId ?? "") === (event.identity.storeId ?? "") &&
    record.producerService === event.producer.service &&
    (record.producerEnvironment ?? "") === (event.producer.environment ?? "") &&
    record.source === event.source &&
    record.idempotencyScope === event.idempotency.scope &&
    record.idempotencyKey === event.idempotency.key
  );
}
