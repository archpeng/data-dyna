# Testable Runtime Deployment Runbook

This runbook is the P1/P2-lite Docker/test runtime path for `data-dyna`. It proves that the runtime image can start, connect to a migrated local PostgreSQL database, serve unauthenticated `/healthz`, and exercise authenticated `/events` traffic with tenant-safe local/test credentials through the smoke gate.

It is not a production deployment runbook. It does not provide full IAM, OAuth/SSO, cloud secret management, production observability, external producer integration, durable workers, or Agent runtime ownership.

## Preconditions

- Node.js 24 and npm are available on the host.
- Docker Engine with Compose support is available on the host.
- Host ports `55432` and `13010` are free, or you intentionally override them below.
- Commands are run from the repository root.
- Use only the placeholder local/test credentials from `.env.example`; do not paste production credentials into shell history, docs, or committed files.

## Runtime variables

`DATA_DYNA_DATABASE_URL` is the canonical runtime database seam.

`DATA_DYNA_INGESTION_CREDENTIALS_JSON` is the P2-lite local/test credential seam for `POST /events` and `POST /events/batch`. `GET /healthz` stays unauthenticated. The token below is a placeholder example only; production secret injection remains outside this repo-local runbook.

The commands below use two shell helper variables because the app container reaches the host database through `host.docker.internal`, while the host-side smoke script reaches the same database through `localhost`.

```bash
export DATA_DYNA_SMOKE_PORT=13010
export DATA_DYNA_HOST_DATABASE_URL=postgresql://data_dyna:data_dyna_local_password@localhost:55432/data_dyna_test
export DATA_DYNA_CONTAINER_DATABASE_URL=postgresql://data_dyna:data_dyna_local_password@host.docker.internal:55432/data_dyna_test
export DATA_DYNA_INGESTION_CREDENTIALS_JSON='[{"credentialId":"local-pos-store-a","token":"<local-placeholder-token-a>","merchantId":"merchant-local-a","storeIds":["store-local-a"],"producer":{"service":"pos-lite-cashier","environment":"test"},"source":"pos"}]'
```

## 1. Start and migrate local PostgreSQL

Start the repo-owned local test database:

```bash
npm run db:test:up
```

Apply and verify the SQL migrations. This gate resets the local `data_dyna_test` public schema before applying the migrations:

```bash
npm run test:db:migrations
```

## 2. Build the runtime image

```bash
npm run docker:build
```

Expected image tag:

```text
data-dyna:testable-runtime
```

## 3. Start the Docker runtime

Remove any stale smoke container, then start the runtime in detached mode with the placeholder P2 credential JSON:

```bash
docker rm -f data-dyna-runtime-smoke 2>/dev/null || true

docker run -d \
  --name data-dyna-runtime-smoke \
  --add-host=host.docker.internal:host-gateway \
  -p "${DATA_DYNA_SMOKE_PORT}:3000" \
  -e DATA_DYNA_RUNTIME_ENV=test \
  -e DATA_DYNA_HTTP_HOST=0.0.0.0 \
  -e DATA_DYNA_HTTP_PORT=3000 \
  -e DATA_DYNA_DATABASE_URL="$DATA_DYNA_CONTAINER_DATABASE_URL" \
  -e DATA_DYNA_INGESTION_CREDENTIALS_JSON="$DATA_DYNA_INGESTION_CREDENTIALS_JSON" \
  data-dyna:testable-runtime
```

Wait until `/healthz` is reachable through the published host port:

```bash
node --input-type=module <<'NODE'
const port = process.env.DATA_DYNA_SMOKE_PORT ?? '13010';
const url = `http://127.0.0.1:${port}/healthz`;
for (let attempt = 0; attempt < 40; attempt += 1) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      console.log(`Runtime healthy at ${url}`);
      process.exit(0);
    }
  } catch {
    // keep waiting
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
}
console.error(`Runtime did not become healthy at ${url}`);
process.exit(1);
NODE
```

## 4. Run the authenticated HTTP smoke gate

Run the smoke gate from the host. It uses real HTTP against the running runtime and verifies PostgreSQL side effects in `raw_events` and `invalid_raw_events`.

```bash
DATA_DYNA_RUNTIME_ENV=test \
DATA_DYNA_HTTP_HOST=127.0.0.1 \
DATA_DYNA_HTTP_PORT="$DATA_DYNA_SMOKE_PORT" \
DATA_DYNA_DATABASE_URL="$DATA_DYNA_HOST_DATABASE_URL" \
DATA_DYNA_INGESTION_CREDENTIALS_JSON="$DATA_DYNA_INGESTION_CREDENTIALS_JSON" \
npm run smoke:runtime
```

The smoke gate checks:

- unauthenticated `GET /healthz`;
- missing `Authorization` on `POST /events` returns `401` / `UNAUTHORIZED` plus `WWW-Authenticate: Bearer` with no raw or invalid persistence;
- invalid bearer token on `POST /events` returns `401` / `UNAUTHORIZED` plus `WWW-Authenticate: Bearer` with no raw or invalid persistence;
- authorized tenant-scoped `POST /events` returns `202` and persists `credentialId`, `merchantId`, `storeId`, and producer environment;
- authorized duplicate `POST /events` returns `202` with `duplicate: true` and does not insert another raw event;
- authorized tenant mismatch returns `403` / `TENANT_MISMATCH`, persists only `invalid_raw_events` audit context, and creates no accepted raw event;
- authorized invalid payload returns `400` and persists invalid-event audit context;
- authorized `POST /events/batch` accepts a tenant-scoped valid item.

## 5. Inspect P3 local/test observability outputs

The Docker smoke gate proves real HTTP and PostgreSQL behavior. The current P3 log and metric sinks are intentionally in-process/local-test surfaces, so inspect them with the targeted observability probe instead of requiring a cloud backend or production dashboard:

```bash
npm run probe:observability
```

The probe uses placeholder credentials, `InMemoryRuntimeLogSink`, `InMemoryRuntimeMetricSink`, and `InMemoryRawEventStore`. Its sanitized summary answers whether local/test requests are healthy, unauthorized, accepted, duplicate, invalid, tenant-policy rejected, and covered by duration observations. It must not print bearer tokens, credential JSON, idempotency keys, raw payload secrets, merchant/store identifiers, event ids, or request run ids.

For the P4 POS producer pilot, run the producer-specific local/test probe:

```bash
npm run probe:pos-producer
```

That probe maps a sanitized POS order-paid fixture, delivers it through the injected `POST /events` transport, and prints safe counts for delivery outcomes, accepted raw-event rows, invalid-event reason codes, P3 log events, P3 metric counters, and replay/backfill handoff. It is a Data Dyna-side proof only: it uses placeholder credentials, in-memory stores/sinks, no production secrets, no real external POS runtime, no real network call by default, and no durable worker queue.

Use `npm run test:runtime` for the full local observability regression ladder, including structured-log and metric redaction tests. Use `npm run smoke:runtime` for HTTP/PostgreSQL side-effect proof only; the smoke script does not expose the in-memory observability sinks from the running container.

## 6. Run the local validation ladder

After the Docker smoke path passes, keep the deterministic gates green:

```bash
npm run probe:observability
npm run probe:pos-producer
npm run test:runtime
npm run typecheck
npm test
npm run check:boundaries
npm run check:schema-migrations
npm run check:plan
git diff --check
```

`npm run test:db:migrations`, `npm run docker:build`, and `npm run smoke:runtime` are part of the executable path above.

## 7. Stop and clean up

Stop only the runtime container:

```bash
docker rm -f data-dyna-runtime-smoke
```

Stop local PostgreSQL without deleting its Docker volume:

```bash
npm run db:test:down
```

Reset local PostgreSQL from scratch when needed:

```bash
npm run db:test:reset
```

## Troubleshooting

- **Container cannot connect to PostgreSQL**: confirm the Docker run command includes `--add-host=host.docker.internal:host-gateway` and passes `DATA_DYNA_DATABASE_URL="$DATA_DYNA_CONTAINER_DATABASE_URL"`.
- **Runtime exits immediately with missing auth config**: confirm the Docker run command passes `DATA_DYNA_INGESTION_CREDENTIALS_JSON` and that the JSON contains non-empty `credentialId`, `token`, `merchantId`, `storeIds`, `producer.service`, `producer.environment`, and `source` fields.
- **Smoke script cannot connect to PostgreSQL**: the smoke script runs on the host, so pass `DATA_DYNA_DATABASE_URL="$DATA_DYNA_HOST_DATABASE_URL"` to `npm run smoke:runtime`.
- **Smoke script reports missing ingestion credentials**: pass the same placeholder `DATA_DYNA_INGESTION_CREDENTIALS_JSON` to both `docker run` and the host-side `npm run smoke:runtime` command.
- **Smoke script says migrated tables are missing**: rerun `npm run test:db:migrations` before starting the runtime.
- **Smoke returns `401` for the authorized probe**: confirm the runtime container and smoke script received the same placeholder credential JSON.
- **Port is already in use**: change `DATA_DYNA_SMOKE_PORT` and rerun the Docker and smoke commands.
- **Need to abandon the run**: run `docker rm -f data-dyna-runtime-smoke` and then `npm run db:test:down`.

## Explicit residuals

This P1/P2/P3 local-test path leaves the following work open for successor packs:

- Production-readiness master tracker writeback and P4 successor-pack creation after P3 closeout is persisted.
- Production traces, cloud observability backend selection, dashboards, paging rules, mature SLOs, and incident-management maturity.
- P4 external POS repository/runtime hookup beyond the local/test POS order-paid probe, plus miniapp, mobile-hq, backend producer, or broader POS instrumentation.
- P5 durable worker queue, retries, checkpoints, dead letters, and idempotent background processing.
- P6 full Agent runtime, real Pi provider integration, and production Agent governance.
- Full IAM/OAuth/SSO/admin UI/self-service merchant permissions.
- Cloud production deployment, rollout/rollback, backup/restore, production database lifecycle, and secret management.

The recommended roadmap order remains P2 auth/tenancy before real producer traffic, then P3 observability before wider runtime expansion, then P4 producer integration.
