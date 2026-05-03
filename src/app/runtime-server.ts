import { createRequire } from "node:module";
import type { FastifyInstance, FastifyServerOptions } from "fastify";
import { buildDataDynaApp } from "./app.ts";
import {
  loadRuntimeConfig,
  requireRuntimeDatabaseUrl,
  type RuntimeConfig,
} from "./config/runtime-config.ts";
import {
  PostgresRawEventRepository,
  type PostgresRawEventClient,
} from "./repositories/postgres-raw-event-repository.ts";
import type { RuntimeLogSink } from "./observability/runtime-log.ts";
import type { RuntimeMetricSink } from "./observability/runtime-metrics.ts";

const require = createRequire(import.meta.url);

type PgPool = PostgresRawEventClient & {
  end(): Promise<void>;
};

const { Pool } = require("pg") as {
  Pool: new (options: { connectionString: string; application_name: string }) => PgPool;
};

export type DataDynaRuntimeServerOptions = {
  config?: RuntimeConfig;
  logger?: FastifyServerOptions["logger"];
  observabilityLogSink?: RuntimeLogSink;
  observabilityMetricSink?: RuntimeMetricSink;
};

export function buildDataDynaRuntimeServer(options: DataDynaRuntimeServerOptions = {}): FastifyInstance {
  const config = options.config ?? loadRuntimeConfig();
  const pool = new Pool({
    connectionString: requireRuntimeDatabaseUrl(config),
    application_name: "data-dyna-runtime-server",
  });

  const app = buildDataDynaApp({
    config,
    logger: options.logger ?? true,
    rawEventStore: new PostgresRawEventRepository(pool),
    observabilityLogSink: options.observabilityLogSink,
    observabilityMetricSink: options.observabilityMetricSink,
  });

  app.addHook("onClose", async () => {
    await pool.end();
  });

  return app;
}
