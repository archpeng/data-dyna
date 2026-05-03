# Testable Runtime Deployment Runbook

This runbook is the P1-lite Docker/test runtime path for `data-dyna`. It proves that the runtime image can start, connect to a migrated local PostgreSQL database, serve `/healthz`, and accept `/events` traffic through the smoke gate.

It is not a production deployment runbook. It does not provide cloud rollout, production secrets, auth/tenancy, observability, external producer integration, durable workers, or Agent runtime ownership.

## Preconditions

- Node.js 24 and npm are available on the host.
- Docker Engine with Compose support is available on the host.
- Host ports `55432` and `13010` are free, or you intentionally override them below.
- Commands are run from the repository root.
- Use only the placeholder local/test credentials from `.env.example`; do not paste production credentials into shell history, docs, or committed files.

## Runtime variables

`DATA_DYNA_DATABASE_URL` is the canonical runtime database seam.

The commands below use two shell helper variables because the app container reaches the host database through `host.docker.internal`, while the host-side smoke script reaches the same database through `localhost`.

```bash
export DATA_DYNA_SMOKE_PORT=13010
export DATA_DYNA_HOST_DATABASE_URL=postgresql://data_dyna:data_dyna_local_password@localhost:55432/data_dyna_test
export DATA_DYNA_CONTAINER_DATABASE_URL=postgresql://data_dyna:data_dyna_local_password@host.docker.internal:55432/data_dyna_test
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

Remove any stale smoke container, then start the runtime in detached mode:

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

## 4. Run the HTTP smoke gate

Run the smoke gate from the host. It uses real HTTP against the running runtime and verifies PostgreSQL side effects in `raw_events` and `invalid_raw_events`.

```bash
DATA_DYNA_RUNTIME_ENV=test \
DATA_DYNA_HTTP_HOST=127.0.0.1 \
DATA_DYNA_HTTP_PORT="$DATA_DYNA_SMOKE_PORT" \
DATA_DYNA_DATABASE_URL="$DATA_DYNA_HOST_DATABASE_URL" \
npm run smoke:runtime
```

The smoke gate checks:

- `GET /healthz`
- accepted `POST /events`
- duplicate `POST /events`
- invalid `POST /events`
- `POST /events/batch`

## 5. Run the local validation ladder

After the Docker smoke path passes, keep the deterministic gates green:

```bash
npm run test:runtime
npm run typecheck
npm test
npm run check:boundaries
npm run check:schema-migrations
npm run check:plan
git diff --check
```

`npm run test:db:migrations`, `npm run docker:build`, and `npm run smoke:runtime` are part of the executable path above.

## 6. Stop and clean up

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
- **Smoke script cannot connect to PostgreSQL**: the smoke script runs on the host, so pass `DATA_DYNA_DATABASE_URL="$DATA_DYNA_HOST_DATABASE_URL"` to `npm run smoke:runtime`.
- **Smoke script says migrated tables are missing**: rerun `npm run test:db:migrations` before starting the runtime.
- **Port is already in use**: change `DATA_DYNA_SMOKE_PORT` and rerun the Docker and smoke commands.
- **Runtime exits immediately**: inspect `docker logs data-dyna-runtime-smoke`; missing or non-PostgreSQL `DATA_DYNA_DATABASE_URL` is a startup error.
- **Need to abandon the run**: run `docker rm -f data-dyna-runtime-smoke` and then `npm run db:test:down`.

## Explicit residuals

This P1 path leaves the following work open for successor packs:

- P2 auth/tenancy and tenant-safe event writes.
- P3 structured logs, metrics, traces, alerts, dashboards, and incident/runbook maturity.
- P4 real POS, miniapp, mobile-hq, or backend producer instrumentation.
- P5 durable worker queue, retries, checkpoints, dead letters, and idempotent background processing.
- P6 full Agent runtime, real Pi provider integration, and production Agent governance.
- Cloud production deployment, rollout/rollback, backup/restore, production database lifecycle, and secret management.

The recommended roadmap order remains P2 auth/tenancy before real producer traffic, then P3 observability before wider runtime expansion.
