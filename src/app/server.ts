import { buildDataDynaApp } from "./app.ts";
import { loadRuntimeConfig } from "./config/runtime-config.ts";

const config = loadRuntimeConfig();
const app = buildDataDynaApp({ config, logger: true });

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
  process.exitCode = 1;
}
