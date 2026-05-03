import type { DataDynaEvent, JsonValue } from "../../contracts/event-contract.ts";
import type {
  InvalidRawEventAuditContext,
  InvalidRawEventRecord,
  PersistAcceptedResult,
  RawEventPersistenceContext,
  RawEventRecord,
  RawEventStore,
} from "../../ingestion/raw-event-store.ts";

export type PostgresQueryResult<Row extends Record<string, unknown>> = {
  rows: Row[];
};

export type PostgresRawEventClient = {
  query<Row extends Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<PostgresQueryResult<Row>>;
};

type RawEventRow = {
  event_id: string;
  idempotency_key: string;
  idempotency_scope: DataDynaEvent["idempotency"]["scope"];
  contract_version: DataDynaEvent["version"];
  source: DataDynaEvent["source"];
  domain: DataDynaEvent["domain"];
  name: DataDynaEvent["name"];
  occurred_at: Date | string;
  received_at: Date | string;
  producer_service: string;
  producer_environment: DataDynaEvent["producer"]["environment"] | null;
  credential_id: string | null;
  brand_id: string | null;
  merchant_id: string | null;
  store_id: string | null;
  entity_type: DataDynaEvent["entity"]["type"];
  entity_id: string;
  properties: Record<string, JsonValue>;
  event: DataDynaEvent;
};

type InvalidRawEventRow = {
  received_at: Date | string;
  reason: string;
  payload: unknown;
  credential_id: string | null;
  merchant_id: string | null;
  store_id: string | null;
  producer_service: string | null;
  producer_environment: string | null;
  source: string | null;
  reason_code: string | null;
};

type PostgresError = Error & {
  code?: string;
};

const rawEventColumns = `
  event_id,
  idempotency_key,
  idempotency_scope,
  contract_version,
  source,
  domain,
  name,
  occurred_at,
  received_at,
  producer_service,
  producer_environment,
  credential_id,
  brand_id,
  merchant_id,
  store_id,
  entity_type,
  entity_id,
  properties,
  event
`;

export class PostgresRawEventRepository implements RawEventStore {
  constructor(private readonly client: PostgresRawEventClient) {}

  async persistAccepted(
    event: DataDynaEvent,
    context: RawEventPersistenceContext = {},
  ): Promise<PersistAcceptedResult> {
    try {
      const inserted = await this.client.query<RawEventRow>(
        `INSERT INTO raw_events (
           event_id,
           idempotency_key,
           idempotency_scope,
           contract_version,
           source,
           domain,
           name,
           occurred_at,
           producer_service,
           producer_environment,
           credential_id,
           brand_id,
           merchant_id,
           store_id,
           entity_type,
           entity_id,
           properties,
           event
         ) VALUES (
           $1,
           $2,
           $3,
           $4,
           $5,
           $6,
           $7,
           $8,
           $9,
           $10,
           $11,
           $12,
           $13,
           $14,
           $15,
           $16,
           $17::jsonb,
           $18::jsonb
         )
         RETURNING ${rawEventColumns}`,
        [
          event.correlation.eventId,
          event.idempotency.key,
          event.idempotency.scope,
          event.version,
          event.source,
          event.domain,
          event.name,
          event.occurredAt,
          event.producer.service,
          event.producer.environment ?? null,
          context.credentialId ?? null,
          event.identity.brandId ?? null,
          event.identity.merchantId ?? null,
          event.identity.storeId ?? null,
          event.entity.type,
          event.entity.id,
          stringifyJsonb(event.properties, "accepted event properties"),
          stringifyJsonb(event, "accepted event"),
        ],
      );

      const row = inserted.rows[0];
      if (!row) {
        throw new Error("PostgreSQL raw event insert did not return a row.");
      }

      return { record: toRawEventRecord(row), duplicate: false };
    } catch (error) {
      if (isUniqueViolation(error)) {
        const existingByEventId = await this.findByEventId(event.correlation.eventId);
        if (existingByEventId && !recordMatchesTenantIdempotency(existingByEventId, event)) {
          throw error;
        }

        const existing = await this.findByTenantIdempotency(event);
        if (existing) {
          return { record: existing, duplicate: true };
        }
      }

      throw error;
    }
  }

  async persistInvalid(
    payload: unknown,
    reason: string,
    auditContext: InvalidRawEventAuditContext = {},
  ): Promise<InvalidRawEventRecord> {
    const inserted = await this.client.query<InvalidRawEventRow>(
      `INSERT INTO invalid_raw_events (
         reason,
         payload,
         credential_id,
         merchant_id,
         store_id,
         producer_service,
         producer_environment,
         source,
         reason_code
       ) VALUES (
         $1,
         $2::jsonb,
         $3,
         $4,
         $5,
         $6,
         $7,
         $8,
         $9
       )
       RETURNING received_at, reason, payload, credential_id, merchant_id, store_id, producer_service, producer_environment, source, reason_code`,
      [
        reason,
        stringifyJsonb(payload, "invalid raw event payload"),
        auditContext.credentialId ?? null,
        auditContext.merchantId ?? null,
        auditContext.storeId ?? null,
        auditContext.producerService ?? null,
        auditContext.producerEnvironment ?? null,
        auditContext.source ?? null,
        auditContext.reasonCode ?? null,
      ],
    );

    const row = inserted.rows[0];
    if (!row) {
      throw new Error("PostgreSQL invalid raw event insert did not return a row.");
    }

    return toInvalidRawEventRecord(row);
  }

  private async findByEventId(eventId: string): Promise<RawEventRecord | undefined> {
    const existing = await this.client.query<RawEventRow>(
      `SELECT ${rawEventColumns}
         FROM raw_events
        WHERE event_id = $1
        LIMIT 1`,
      [eventId],
    );

    const row = existing.rows[0];
    return row ? toRawEventRecord(row) : undefined;
  }

  private async findByTenantIdempotency(event: DataDynaEvent): Promise<RawEventRecord | undefined> {
    const existing = await this.client.query<RawEventRow>(
      `SELECT ${rawEventColumns}
         FROM raw_events
        WHERE merchant_id IS NOT DISTINCT FROM $1
          AND store_id IS NOT DISTINCT FROM $2
          AND producer_service = $3
          AND producer_environment IS NOT DISTINCT FROM $4
          AND source = $5
          AND idempotency_scope = $6
          AND idempotency_key = $7
        LIMIT 1`,
      [
        event.identity.merchantId ?? null,
        event.identity.storeId ?? null,
        event.producer.service,
        event.producer.environment ?? null,
        event.source,
        event.idempotency.scope,
        event.idempotency.key,
      ],
    );

    const row = existing.rows[0];
    return row ? toRawEventRecord(row) : undefined;
  }
}

function toRawEventRecord(row: RawEventRow): RawEventRecord {
  return {
    eventId: row.event_id,
    idempotencyKey: row.idempotency_key,
    idempotencyScope: row.idempotency_scope,
    contractVersion: row.contract_version,
    source: row.source,
    domain: row.domain,
    name: row.name,
    occurredAt: toIsoTimestamp(row.occurred_at, "occurred_at"),
    receivedAt: toIsoTimestamp(row.received_at, "received_at"),
    producerService: row.producer_service,
    producerEnvironment: row.producer_environment ?? undefined,
    credentialId: row.credential_id ?? undefined,
    brandId: row.brand_id ?? undefined,
    merchantId: row.merchant_id ?? undefined,
    storeId: row.store_id ?? undefined,
    entityType: row.entity_type,
    entityId: row.entity_id,
    properties: row.properties,
    event: row.event,
  };
}

function toInvalidRawEventRecord(row: InvalidRawEventRow): InvalidRawEventRecord {
  return {
    receivedAt: toIsoTimestamp(row.received_at, "received_at"),
    reason: row.reason,
    payload: row.payload,
    credentialId: row.credential_id ?? undefined,
    merchantId: row.merchant_id ?? undefined,
    storeId: row.store_id ?? undefined,
    producerService: row.producer_service ?? undefined,
    producerEnvironment: row.producer_environment ?? undefined,
    source: row.source ?? undefined,
    reasonCode: row.reason_code ?? undefined,
  };
}

function toIsoTimestamp(value: Date | string, field: string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`PostgreSQL raw event row has invalid ${field} timestamp.`);
  }

  return parsed.toISOString();
}

function stringifyJsonb(value: unknown, label: string): string {
  try {
    return JSON.stringify(value) ?? "null";
  } catch (error) {
    throw new Error(`Cannot persist ${label} as PostgreSQL JSONB: ${(error as Error).message}`);
  }
}

function isUniqueViolation(error: unknown): error is PostgresError {
  return typeof error === "object" && error !== null && (error as PostgresError).code === "23505";
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
