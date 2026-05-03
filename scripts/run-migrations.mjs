#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = join(repoRoot, 'migrations');

const defaultDbName = process.env.DATA_DYNA_TEST_DB_NAME ?? 'data_dyna_test';
const defaultDbUser = process.env.DATA_DYNA_TEST_DB_USER ?? 'data_dyna';
const defaultDbPassword = process.env.DATA_DYNA_TEST_DB_PASSWORD ?? 'data_dyna_local_password';
const defaultDbHost = process.env.DATA_DYNA_TEST_DB_HOST ?? 'localhost';
const defaultDbPort = process.env.DATA_DYNA_TEST_DB_PORT ?? '55432';

function buildDefaultDatabaseUrl() {
  const username = encodeURIComponent(defaultDbUser);
  const password = encodeURIComponent(defaultDbPassword);
  const database = encodeURIComponent(defaultDbName);
  return `postgresql://${username}:${password}@${defaultDbHost}:${defaultDbPort}/${database}`;
}

function describeDatabase(databaseUrl) {
  const parsed = new URL(databaseUrl);
  return `${parsed.pathname.slice(1)} at ${parsed.hostname}:${parsed.port || '5432'} as ${decodeURIComponent(parsed.username)}`;
}

async function listMigrationFiles() {
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right));

  if (files.length === 0) {
    throw new Error('No migration files found in migrations/*.sql.');
  }

  return files;
}

async function applyMigration(client, file) {
  const sql = await readFile(join(migrationsDir, file), 'utf8');

  if (sql.trim().length === 0) {
    throw new Error(`Migration ${file} is empty.`);
  }

  process.stdout.write(`Applying ${file} ... `);

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('ok');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Preserve the original PostgreSQL error below.
    }

    console.error('failed');
    console.error(`Migration failed: ${file}`);
    console.error(`PostgreSQL error: ${error.message}`);
    error.migrationFailureLogged = true;
    throw error;
  }
}

async function main() {
  const databaseUrl = process.env.DATA_DYNA_TEST_DATABASE_URL ?? buildDefaultDatabaseUrl();
  const files = await listMigrationFiles();
  const client = new Client({
    connectionString: databaseUrl,
    application_name: 'data-dyna-migration-runner',
  });

  console.log(`Running ${files.length} migrations in lexicographic order against ${describeDatabase(databaseUrl)}.`);

  await client.connect();
  try {
    for (const file of files) {
      await applyMigration(client, file);
    }
  } finally {
    await client.end();
  }

  console.log(`Applied ${files.length} migrations.`);
}

main().catch((error) => {
  if (!error.migrationFailureLogged) {
    console.error(`Migration runner failed: ${error.message}`);
  }
  process.exitCode = 1;
});
