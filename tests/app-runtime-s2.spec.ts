import assert from "node:assert/strict";
import { buildDataDynaApp } from "../src/app/app.ts";
import { loadRuntimeConfig } from "../src/app/config/runtime-config.ts";

const config = loadRuntimeConfig({
  DATA_DYNA_RUNTIME_ENV: "test",
  DATA_DYNA_HTTP_HOST: "127.0.0.1",
  DATA_DYNA_HTTP_PORT: "3010",
});

assert.deepEqual(config, {
  runtimeEnvironment: "test",
  httpHost: "127.0.0.1",
  httpPort: 3010,
});

const defaultConfig = loadRuntimeConfig({});
assert.deepEqual(defaultConfig, {
  runtimeEnvironment: "local",
  httpHost: "127.0.0.1",
  httpPort: 3000,
});

assert.throws(
  () => loadRuntimeConfig({ DATA_DYNA_RUNTIME_ENV: "prod" }),
  /Invalid Data Dyna local\/test runtime config: DATA_DYNA_RUNTIME_ENV:/,
);

assert.throws(
  () => loadRuntimeConfig({ DATA_DYNA_HTTP_PORT: "0" }),
  /Invalid Data Dyna local\/test runtime config: DATA_DYNA_HTTP_PORT:/,
);

const app = buildDataDynaApp({ config });

try {
  const response = await app.inject({ method: "GET", url: "/healthz" });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    ok: true,
    service: "data-dyna",
    runtimeEnvironment: "test",
  });
} finally {
  await app.close();
}
