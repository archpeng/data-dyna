import { loadRuntimeConfig } from "./config/runtime-config.ts";
import { buildDataDynaRuntimeServer } from "./runtime-server.ts";

const config = loadRuntimeConfig();
const app = buildDataDynaRuntimeServer({ config, logger: true });

let closing = false;
async function closeRuntime(signal: NodeJS.Signals): Promise<void> {
  if (closing) {
    return;
  }

  closing = true;
  app.log.info({ signal }, "data-dyna local runtime shutting down");
  await app.close();
}

process.once("SIGINT", closeRuntime);
process.once("SIGTERM", closeRuntime);

try {
  await app.listen({ host: config.httpHost, port: config.httpPort });
  app.log.info(
    {
      host: config.httpHost,
      port: config.httpPort,
      runtimeEnvironment: config.runtimeEnvironment,
    },
    "data-dyna local runtime listening",
  );
} catch (error) {
  app.log.error(error, "data-dyna local runtime failed to start");
  await app.close().catch(() => undefined);
  process.exitCode = 1;
}
