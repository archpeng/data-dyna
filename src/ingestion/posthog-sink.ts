import type { DataDynaEvent } from "../contracts/event-contract.ts";

export type PostHogSinkEvent = {
  event: DataDynaEvent["name"];
  distinctId: string;
  properties: DataDynaEvent["properties"];
};

export interface AsyncPostHogSink {
  enqueue(event: PostHogSinkEvent): Promise<void>;
}

export function toPostHogSinkEvent(event: DataDynaEvent): PostHogSinkEvent {
  const properties: DataDynaEvent["properties"] = {
    ...event.properties,
    source: event.source,
    eventId: event.correlation.eventId,
  };

  if (event.identity.storeId) {
    properties.storeId = event.identity.storeId;
  }
  if (event.identity.brandId) {
    properties.brandId = event.identity.brandId;
  }

  return {
    event: event.name,
    distinctId:
      event.identity.memberId ??
      event.identity.customerId ??
      event.identity.deviceId ??
      event.identity.storeId ??
      event.correlation.eventId,
    properties,
  };
}
