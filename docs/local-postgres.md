# Local PostgreSQL Test Substrate

This substrate is for local development and CI migration tests only. It is not production database ownership, cloud provisioning, backup policy, restore policy, or secret management.

## Deterministic test conventions

- Docker Compose service: `postgres`
- Container name: `data-dyna-postgres-test`
- Database: `data_dyna_test`
- User: `data_dyna`
- Placeholder password: `data_dyna_local_password`
- Host: `localhost`
- Host port: `55432`
- Connection string: `postgresql://data_dyna:data_dyna_local_password@localhost:55432/data_dyna_test`

The same placeholder values are documented in `.env.example`. Do not put production credentials in `.env`, `.env.example`, Docker Compose, package scripts, or docs.

## Commands

Start the local test database:

```bash
npm run db:test:up
```

Execute the current SQL migrations in lexicographic filename order against the local/CI connection string:

```bash
npm run db:migrate:test
```

Run the PostgreSQL migration constraint integration gate:

```bash
npm run test:db:migrations
```

The integration gate resets the `public` schema in the reviewed local test database, runs `npm run db:migrate:test`, then verifies the migrated table catalog and required PostgreSQL constraints with real inserts/catalog checks. By default it only resets `data_dyna_test` at `localhost:55432` as `data_dyna`; CI-only test databases must opt in with `DATA_DYNA_TEST_DATABASE_RESET_ALLOWED=true`.

The runner reads `DATA_DYNA_TEST_DATABASE_URL` when set; otherwise it uses the placeholder connection string documented above. Failure output names the migration file and PostgreSQL error.

## CI parity

GitHub Actions runs the same DB gate in `.github/workflows/db-migration-gate.yml`. The workflow starts a `postgres:16-alpine` service with the placeholder `data_dyna_test` / `data_dyna` / `data_dyna_local_password` credentials, exposes it on `localhost:55432`, and runs these visible commands after `npm ci`:

```bash
git diff --check
npm run check:schema-migrations
npm run test:db:migrations
npm test
npm run typecheck
```

The workflow uses only test-local environment variables and does not require production secrets, branch protection changes, or remote repository settings.

Stop it without removing the local Docker volume:

```bash
npm run db:test:down
```

Reset it by removing the local Docker volume and starting a fresh database:

```bash
npm run db:test:reset
```

## Scope boundary

This substrate, runner, and migration constraint integration gate are local/CI execution gates only. `migrations/*.sql` remain the migration source of truth; `scripts/run-migrations.mjs` and `scripts/check-db-migrations.mjs` do not replace them, do not provision production databases, and do not define rollout/rollback policy.
