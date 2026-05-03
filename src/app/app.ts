import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import type { AsyncPostHogSink } from "../ingestion/posthog-sink.ts";
import type { RawEventStore } from "../ingestion/raw-event-store.ts";
import type { RuntimeConfig } from "./config/runtime-config.ts";
import { registerEventsRoutes } from "./http/events-route.ts";

export type DataDynaAppOptions = {
  config: RuntimeConfig;
  logger?: FastifyServerOptions["logger"];
  rawEventStore?: RawEventStore;
  postHogSink?: AsyncPostHogSink;
};

export function buildDataDynaApp(options: DataDynaAppOptions): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? false });

  app.get("/healthz", async () => ({
    ok: true,
    service: "data-dyna",
    runtimeEnvironment: options.config.runtimeEnvironment,
  }));

  if (options.rawEventStore) {
    app.register(registerEventsRoutes, {
      store: options.rawEventStore,
      postHogSink: options.postHogSink,
    });
  }

  return app;
}
