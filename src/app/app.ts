import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import type { AsyncPostHogSink } from "../ingestion/posthog-sink.ts";
import type { RawEventStore } from "../ingestion/raw-event-store.ts";
import { requireIngestionCredentials, type RuntimeConfig } from "./config/runtime-config.ts";
import { registerEventsRoutes } from "./http/events-route.ts";
import type { RuntimeLogSink } from "./observability/runtime-log.ts";
import type { RuntimeMetricSink } from "./observability/runtime-metrics.ts";

export type DataDynaAppOptions = {
  config: RuntimeConfig;
  logger?: FastifyServerOptions["logger"];
  rawEventStore?: RawEventStore;
  postHogSink?: AsyncPostHogSink;
  observabilityLogSink?: RuntimeLogSink;
  observabilityMetricSink?: RuntimeMetricSink;
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
      ingestionCredentials: requireIngestionCredentials(options.config),
      runtimeEnvironment: options.config.runtimeEnvironment,
      observabilityLogSink: options.observabilityLogSink,
      observabilityMetricSink: options.observabilityMetricSink,
    });
  }

  return app;
}
