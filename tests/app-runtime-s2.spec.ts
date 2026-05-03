import assert from "node:assert/strict";
import { buildDataDynaApp } from "../src/app/app.ts";
import { loadRuntimeConfig } from "../src/app/config/runtime-config.ts";
import { buildDataDynaRuntimeServer } from "../src/app/runtime-server.ts";

const databaseUrl = "postgresql://data_dyna:data_dyna_local_password@localhost:55432/data_dyna_test";
const ingestionCredential = {
  credentialId: "local-pos-store-a",
  token: "<local-placeholder-token-a>",
  merchantId: "merchant-local-a",
  storeIds: ["store-local-a"],
  producer: {
    service: "pos-lite-cashier",
    environment: "test",
  },
  source: "pos",
};
const config = loadRuntimeConfig({
  DATA_DYNA_RUNTIME_ENV: "test",
  DATA_DYNA_HTTP_HOST: "127.0.0.1",
  DATA_DYNA_HTTP_PORT: "3010",
  DATA_DYNA_DATABASE_URL: databaseUrl,
  DATA_DYNA_INGESTION_CREDENTIALS_JSON: JSON.stringify([ingestionCredential]),
});

assert.deepEqual(config, {
  runtimeEnvironment: "test",
  httpHost: "127.0.0.1",
  httpPort: 3010,
  databaseUrl,
  ingestionCredentials: [ingestionCredential],
});

const defaultConfig = loadRuntimeConfig({});
assert.deepEqual(defaultConfig, {
  runtimeEnvironment: "local",
  httpHost: "127.0.0.1",
  httpPort: 3000,
  databaseUrl: undefined,
  ingestionCredentials: undefined,
});

assert.throws(
  () => loadRuntimeConfig({ DATA_DYNA_RUNTIME_ENV: "prod" }),
  /Invalid Data Dyna local\/test runtime config: DATA_DYNA_RUNTIME_ENV:/,
);

assert.throws(
  () => loadRuntimeConfig({ DATA_DYNA_HTTP_PORT: "0" }),
  /Invalid Data Dyna local\/test runtime config: DATA_DYNA_HTTP_PORT:/,
);

assert.throws(
  () => loadRuntimeConfig({ DATA_DYNA_DATABASE_URL: "http://localhost/data_dyna_test" }),
  /Invalid Data Dyna local\/test runtime config: DATA_DYNA_DATABASE_URL: database URL must use postgres:\/\/ or postgresql:\/\//,
);

assert.throws(
  () => loadRuntimeConfig({ DATA_DYNA_INGESTION_CREDENTIALS_JSON: "not-json" }),
  /Invalid Data Dyna local\/test runtime config: DATA_DYNA_INGESTION_CREDENTIALS_JSON: must be valid JSON/,
);

assert.throws(
  () => loadRuntimeConfig({ DATA_DYNA_INGESTION_CREDENTIALS_JSON: JSON.stringify([]) }),
  /Invalid Data Dyna local\/test runtime config: DATA_DYNA_INGESTION_CREDENTIALS_JSON:/,
);

assert.throws(
  () =>
    loadRuntimeConfig({
      DATA_DYNA_INGESTION_CREDENTIALS_JSON: JSON.stringify([
        ingestionCredential,
        { ...ingestionCredential, credentialId: "local-pos-store-b" },
      ]),
    }),
  /Invalid Data Dyna local\/test runtime config: DATA_DYNA_INGESTION_CREDENTIALS_JSON: duplicate token/,
);

assert.throws(
  () =>
    loadRuntimeConfig({
      DATA_DYNA_INGESTION_CREDENTIALS_JSON: JSON.stringify([
        ingestionCredential,
        { ...ingestionCredential, token: "<local-placeholder-token-b>" },
      ]),
    }),
  /Invalid Data Dyna local\/test runtime config: DATA_DYNA_INGESTION_CREDENTIALS_JSON: duplicate credentialId/,
);

assert.throws(
  () => buildDataDynaRuntimeServer({ config: defaultConfig, logger: false }),
  /DATA_DYNA_DATABASE_URL is required for PostgreSQL-backed event routes/,
);

const databaseOnlyConfig = loadRuntimeConfig({
  DATA_DYNA_RUNTIME_ENV: "test",
  DATA_DYNA_DATABASE_URL: databaseUrl,
});
assert.throws(
  () => buildDataDynaRuntimeServer({ config: databaseOnlyConfig, logger: false }),
  /DATA_DYNA_INGESTION_CREDENTIALS_JSON is required for authenticated event routes/,
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

const runtimeServer = buildDataDynaRuntimeServer({ config, logger: false });
try {
  await runtimeServer.ready();
  assert.equal(runtimeServer.hasRoute({ method: "POST", url: "/events" }), true);
  assert.equal(runtimeServer.hasRoute({ method: "POST", url: "/events/batch" }), true);

  const response = await runtimeServer.inject({ method: "GET", url: "/healthz" });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), {
    ok: true,
    service: "data-dyna",
    runtimeEnvironment: "test",
  });
} finally {
  await runtimeServer.close();
}
