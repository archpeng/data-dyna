import type { DataDynaEvent, JsonValue } from "../../contracts/event-contract.ts";
import type {
  InvalidRawEventRecord,
  PersistAcceptedResult,
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
  contract_version: DataDynaEvent["version"];
  source: DataDynaEvent["source"];
  domain: DataDynaEvent["domain"];
  name: DataDynaEvent["name"];
  occurred_at: Date | string;
  received_at: Date | string;
  producer_service: string;
  brand_id: string | null;
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
};

const rawEventColumns = `
  event_id,
  idempotency_key,
  contract_version,
  source,
  domain,
  name,
  occurred_at,
  received_at,
  producer_service,
  brand_id,
  store_id,
  entity_type,
  entity_id,
  properties,
  event
`;

export class PostgresRawEventRepository implements RawEventStore {
  constructor(private readonly client: PostgresRawEventClient) {}

  async persistAccepted(event: DataDynaEvent): Promise<PersistAcceptedResult> {
    const inserted = await this.client.query<RawEventRow>(
      `INSERT INTO raw_events (
         event_id,
         idempotency_key,
         contract_version,
         source,
         domain,
         name,
         occurred_at,
         producer_service,
         brand_id,
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
         $13::jsonb,
         $14::jsonb
       ) ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING ${rawEventColumns}`,
      [
        event.correlation.eventId,
        event.idempotency.key,
        event.version,
        event.source,
        event.domain,
        event.name,
        event.occurredAt,
        event.producer.service,
        event.identity.brandId ?? null,
        event.identity.storeId ?? null,
        event.entity.type,
        event.entity.id,
        stringifyJsonb(event.properties, "accepted event properties"),
        stringifyJsonb(event, "accepted event"),
      ],
    );

    if (inserted.rows[0]) {
      return { record: toRawEventRecord(inserted.rows[0]), duplicate: false };
    }

    const existing = await this.client.query<RawEventRow>(
      `SELECT ${rawEventColumns}
         FROM raw_events
        WHERE idempotency_key = $1`,
      [event.idempotency.key],
    );

    const row = existing.rows[0];
    if (!row) {
      throw new Error(`PostgreSQL raw event duplicate lookup failed for idempotency key ${event.idempotency.key}.`);
    }

    return { record: toRawEventRecord(row), duplicate: true };
  }

  async persistInvalid(payload: unknown, reason: string): Promise<InvalidRawEventRecord> {
    const inserted = await this.client.query<InvalidRawEventRow>(
      `INSERT INTO invalid_raw_events (reason, payload)
       VALUES ($1, $2::jsonb)
       RETURNING received_at, reason, payload`,
      [reason, stringifyJsonb(payload, "invalid raw event payload")],
    );

    const row = inserted.rows[0];
    if (!row) {
      throw new Error("PostgreSQL invalid raw event insert did not return a row.");
    }

    return {
      receivedAt: toIsoTimestamp(row.received_at, "received_at"),
      reason: row.reason,
      payload: row.payload,
    };
  }
}

function toRawEventRecord(row: RawEventRow): RawEventRecord {
  return {
    eventId: row.event_id,
    idempotencyKey: row.idempotency_key,
    contractVersion: row.contract_version,
    source: row.source,
    domain: row.domain,
    name: row.name,
    occurredAt: toIsoTimestamp(row.occurred_at, "occurred_at"),
    receivedAt: toIsoTimestamp(row.received_at, "received_at"),
    producerService: row.producer_service,
    brandId: row.brand_id ?? undefined,
    storeId: row.store_id ?? undefined,
    entityType: row.entity_type,
    entityId: row.entity_id,
    properties: row.properties,
    event: row.event,
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
