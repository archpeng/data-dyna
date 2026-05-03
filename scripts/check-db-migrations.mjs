#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const defaultDbName = process.env.DATA_DYNA_TEST_DB_NAME ?? 'data_dyna_test';
const defaultDbUser = process.env.DATA_DYNA_TEST_DB_USER ?? 'data_dyna';
const defaultDbPassword = process.env.DATA_DYNA_TEST_DB_PASSWORD ?? 'data_dyna_local_password';
const defaultDbHost = process.env.DATA_DYNA_TEST_DB_HOST ?? 'localhost';
const defaultDbPort = process.env.DATA_DYNA_TEST_DB_PORT ?? '55432';

const expectedTables = [
  'action_effects',
  'agent_run_events',
  'agent_runs',
  'carts',
  'evidence_records',
  'experiment_action_lifecycle_records',
  'experiment_plan_reviews',
  'experiment_review_decisions',
  'experiment_review_views',
  'guardrail_results',
  'intervention_trajectories',
  'invalid_raw_events',
  'items',
  'member_profiles',
  'member_rfm_snapshots',
  'members',
  'menus',
  'merchant_actions',
  'merchant_confirmations',
  'merchant_preference_candidates',
  'merchant_preferences',
  'metric_snapshots',
  'opportunity_gaps',
  'order_items',
  'orders',
  'payments',
  'peer_benchmarks',
  'peer_groups',
  'raw_events',
  'refunds',
  'restaurant_segments',
  'sessions',
  'store_profile_snapshots',
];

function buildDefaultDatabaseUrl() {
  const username = encodeURIComponent(defaultDbUser);
  const password = encodeURIComponent(defaultDbPassword);
  const database = encodeURIComponent(defaultDbName);
  return `postgresql://${username}:${password}@${defaultDbHost}:${defaultDbPort}/${database}`;
}

function databaseUrl() {
  return process.env.DATA_DYNA_TEST_DATABASE_URL ?? buildDefaultDatabaseUrl();
}

function assertResetTargetIsTestOnly(url) {
  const parsed = new URL(url);
  const database = decodeURIComponent(parsed.pathname.slice(1));
  const username = decodeURIComponent(parsed.username);
  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  const port = parsed.port || '5432';
  const localDefaultTarget =
    database === 'data_dyna_test' &&
    username === 'data_dyna' &&
    ['localhost', '127.0.0.1', '::1'].includes(hostname) &&
    port === '55432';
  const explicitlyAllowedTestTarget =
    database === 'data_dyna_test' && process.env.DATA_DYNA_TEST_DATABASE_RESET_ALLOWED === 'true';

  if (!localDefaultTarget && !explicitlyAllowedTestTarget) {
    throw new Error(
      'Refusing to reset a database outside the reviewed local/CI test target. ' +
        'Use data_dyna_test on localhost:55432 as data_dyna, or set DATA_DYNA_TEST_DATABASE_RESET_ALLOWED=true for a CI-only test database.',
    );
  }
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function withClient(url, applicationName, action) {
  const client = new Client({ connectionString: url, application_name: applicationName });
  await client.connect();
  try {
    return await action(client);
  } finally {
    await client.end();
  }
}

async function waitForPostgres(url) {
  let latestError;
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await withClient(url, 'data-dyna-db-migration-check-wait', (client) => client.query('SELECT 1'));
      return;
    } catch (error) {
      latestError = error;
      await sleep(1000);
    }
  }

  throw new Error(`PostgreSQL was not reachable for migration integration checks: ${latestError.message}`);
}

async function resetPublicSchema(url) {
  await withClient(url, 'data-dyna-db-migration-check-reset', async (client) => {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
  });
}

function runMigrationRunner(url) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, ['scripts/run-migrations.mjs'], {
      cwd: repoRoot,
      env: { ...process.env, DATA_DYNA_TEST_DATABASE_URL: url },
      stdio: 'inherit',
    });

    child.on('error', rejectRun);
    child.on('exit', (code) => {
      if (code === 0) {
        resolveRun();
        return;
      }

      rejectRun(new Error(`Migration runner exited with code ${code}`));
    });
  });
}

async function expectCheckViolation(client, label, sql, values = []) {
  let violation;
  await client.query('BEGIN');
  try {
    await client.query(sql, values);
  } catch (error) {
    violation = error;
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
  }

  assert.ok(violation, `${label}: expected PostgreSQL to reject the invalid insert.`);
  assert.equal(violation.code, '23514', `${label}: expected CHECK violation, got ${violation.code}.`);
  console.log(`Verified CHECK constraint: ${label} (${violation.constraint ?? violation.message})`);
}

async function assertTablesExist(client) {
  const { rows } = await client.query(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'`,
  );
  const existing = new Set(rows.map((row) => row.table_name));
  const missing = expectedTables.filter((table) => !existing.has(table));

  assert.deepEqual(missing, [], `Missing migrated tables: ${missing.join(', ')}`);
  console.log(`Verified migrated table catalog: ${expectedTables.length} expected tables exist.`);
}

async function assertBusinessMutationConstraint(client) {
  const submittedBy = { actorType: 'agent', actorId: 'agent:fixture' };
  const merchantActor = { actorType: 'merchant', actorId: 'merchant:fixture' };
  const evidenceRefs = ['evidence:db-migration-check'];

  await client.query(
    `INSERT INTO experiment_plan_reviews (
       review_id,
       experiment_plan_id,
       hypothesis_id,
       agent_run_id,
       brand_id,
       store_id,
       opportunity_gap_id,
       review_status,
       lifecycle_state,
       submitted_at,
       submitted_by,
       experiment_plan,
       validation_result,
       evidence_refs
     ) VALUES (
       'review:db-migration-check',
       'experiment_plan:db-migration-check',
       'hypothesis:db-migration-check',
       'agent_run:db-migration-check',
       'brand:db-migration-check',
       'store:db-migration-check',
       'opportunity_gap:db-migration-check',
       'submitted_for_review',
       'drafted',
       '2026-05-03T00:00:00.000Z',
       $1::jsonb,
       $2::jsonb,
       $3::jsonb,
       $4::jsonb
     )`,
    [JSON.stringify(submittedBy), JSON.stringify({ plan: 'fixture' }), JSON.stringify({ decision: 'accept' }), JSON.stringify(evidenceRefs)],
  );

  await client.query(
    `INSERT INTO experiment_review_decisions (
       decision_id,
       review_id,
       experiment_plan_id,
       brand_id,
       store_id,
       decision,
       event_name,
       decided_at,
       actor,
       lifecycle_from_state,
       lifecycle_to_state,
       evidence_refs
     ) VALUES (
       'decision:db-migration-check:accepted',
       'review:db-migration-check',
       'experiment_plan:db-migration-check',
       'brand:db-migration-check',
       'store:db-migration-check',
       'accepted',
       'mobile_hq.experiment_accepted',
       '2026-05-03T00:05:00.000Z',
       $1::jsonb,
       'drafted',
       'accepted',
       $2::jsonb
     )`,
    [JSON.stringify(merchantActor), JSON.stringify(evidenceRefs)],
  );

  const { rows } = await client.query(
    `INSERT INTO experiment_action_lifecycle_records (
       lifecycle_record_id,
       review_id,
       experiment_plan_id,
       brand_id,
       store_id,
       event_name,
       occurred_at,
       actor,
       from_state,
       to_state,
       acceptance_decision_id,
       rollback_ref,
       evidence_refs
     ) VALUES (
       'lifecycle:db-migration-check:default-false',
       'review:db-migration-check',
       'experiment_plan:db-migration-check',
       'brand:db-migration-check',
       'store:db-migration-check',
       'mobile_hq.experiment_applied_recorded',
       '2026-05-03T00:10:00.000Z',
       $1::jsonb,
       'accepted',
       'applied',
       'decision:db-migration-check:accepted',
       'rollback:db-migration-check',
       $2::jsonb
     ) RETURNING business_mutation_called`,
    [JSON.stringify(merchantActor), JSON.stringify(evidenceRefs)],
  );
  assert.equal(rows[0].business_mutation_called, false);

  await expectCheckViolation(
    client,
    'business_mutation_called = FALSE',
    `INSERT INTO experiment_action_lifecycle_records (
       lifecycle_record_id,
       review_id,
       experiment_plan_id,
       brand_id,
       store_id,
       event_name,
       occurred_at,
       actor,
       from_state,
       to_state,
       acceptance_decision_id,
       rollback_ref,
       evidence_refs,
       business_mutation_called
     ) VALUES (
       'lifecycle:db-migration-check:invalid-business-mutation',
       'review:db-migration-check',
       'experiment_plan:db-migration-check',
       'brand:db-migration-check',
       'store:db-migration-check',
       'mobile_hq.experiment_applied_recorded',
       '2026-05-03T00:15:00.000Z',
       $1::jsonb,
       'accepted',
       'applied',
       'decision:db-migration-check:accepted',
       'rollback:db-migration-check',
       $2::jsonb,
       TRUE
     )`,
    [JSON.stringify(merchantActor), JSON.stringify(evidenceRefs)],
  );
}

async function assertEvidenceClaimsConstraint(client) {
  const baseValues = [
    'intervention_trajectory:db-migration-check',
    'restaurant_segment:db-migration-check',
    'opportunity_gap:db-migration-check',
    'experiment_plan:db-migration-check',
    'action_effect:db-migration-check',
    JSON.stringify(['guardrail_result:db-migration-check']),
    JSON.stringify(['lifecycle:db-migration-check:default-false']),
    JSON.stringify(['evidence:db-migration-check']),
    JSON.stringify(['restaurant_segment:db-migration-check', 'action_effect:db-migration-check']),
  ];

  const { rows } = await client.query(
    `INSERT INTO evidence_records (
       evidence_record_id,
       intervention_trajectory_id,
       segment_ref,
       opportunity_gap_id,
       experiment_plan_id,
       outcome_ref,
       guardrail_refs,
       adoption_refs,
       verdict,
       interpretation,
       evidence_refs,
       reproducible_input_refs
     ) VALUES (
       'evidence_record:db-migration-check:default-claims',
       $1,
       $2,
       $3,
       $4,
       $5,
       $6::jsonb,
       $7::jsonb,
       'clean_success',
       'directional_before_after_non_causal',
       $8::jsonb,
       $9::jsonb
     ) RETURNING llm_generated_claims`,
    baseValues,
  );
  assert.deepEqual(rows[0].llm_generated_claims, []);

  await expectCheckViolation(
    client,
    "llm_generated_claims = '[]'",
    `INSERT INTO evidence_records (
       evidence_record_id,
       intervention_trajectory_id,
       segment_ref,
       opportunity_gap_id,
       experiment_plan_id,
       outcome_ref,
       guardrail_refs,
       adoption_refs,
       verdict,
       interpretation,
       evidence_refs,
       reproducible_input_refs,
       llm_generated_claims
     ) VALUES (
       'evidence_record:db-migration-check:invalid-llm-claims',
       $1,
       $2,
       $3,
       $4,
       $5,
       $6::jsonb,
       $7::jsonb,
       'clean_success',
       'directional_before_after_non_causal',
       $8::jsonb,
       $9::jsonb,
       $10::jsonb
     )`,
    [...baseValues, JSON.stringify(['llm-authored-claim'])],
  );
}

async function assertFinalFactSourceConstraint(client) {
  const { rows } = await client.query(
    `INSERT INTO orders (order_id, status, final_fact_source)
     VALUES ('order:db-migration-check:valid-pos', 'paid', 'pos')
     RETURNING final_fact_source`,
  );
  assert.equal(rows[0].final_fact_source, 'pos');

  await expectCheckViolation(
    client,
    "final_fact_source = 'pos'",
    `INSERT INTO orders (order_id, status, final_fact_source)
     VALUES ('order:db-migration-check:invalid-source', 'paid', 'frontend')`,
  );
}

async function assertMemberRfmSourceTableConstraint(client) {
  const commonColumns = `(
    member_id,
    brand_id,
    snapshot_date,
    source_table,
    rfm_tag_30d,
    rfm_tag_90d,
    rfm_tag_180d,
    pay_cnt_90d,
    pay_amount_90d,
    avg_pay_amount_90d
  )`;

  const { rows } = await client.query(
    `INSERT INTO member_rfm_snapshots ${commonColumns}
     VALUES (
       'member:db-migration-check:valid-source',
       'brand:db-migration-check',
       '2026-05-03',
       'report.crm.member_labels',
       'active',
       'loyal',
       'core',
       3,
       45.00,
       15.00
     ) RETURNING source_table`,
  );
  assert.equal(rows[0].source_table, 'report.crm.member_labels');

  await expectCheckViolation(
    client,
    "source_table = 'report.crm.member_labels'",
    `INSERT INTO member_rfm_snapshots ${commonColumns}
     VALUES (
       'member:db-migration-check:invalid-source',
       'brand:db-migration-check',
       '2026-05-03',
       'crm.member_labels',
       'active',
       'loyal',
       'core',
       3,
       45.00,
       15.00
     )`,
  );
}

async function assertPeerBenchmarkConstraints(client) {
  const { rows } = await client.query(
    `INSERT INTO peer_groups (
       peer_group_id,
       snapshot_date,
       segment_label,
       metric_id,
       metric_window,
       min_peer_store_count,
       peer_store_count,
       sample_status,
       deidentification_method,
       evidence_refs
     ) VALUES (
       'peer_group:db-migration-check:valid',
       '2026-05-03',
       'independent_cafe_core',
       'avg_order_value',
       'snapshot',
       3,
       3,
       'sufficient',
       'aggregate_only_no_peer_store_ids',
       ARRAY['evidence:db-migration-check']
     ) RETURNING min_peer_store_count, deidentification_method`,
  );
  assert.equal(rows[0].min_peer_store_count, 3);
  assert.equal(rows[0].deidentification_method, 'aggregate_only_no_peer_store_ids');

  const directPeerColumns = await client.query(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('peer_groups', 'peer_benchmarks')
        AND column_name IN ('peer_store_id', 'peer_store_ids', 'store_ids')
      ORDER BY table_name, column_name`,
  );
  assert.deepEqual(directPeerColumns.rows, []);

  await expectCheckViolation(
    client,
    "deidentification_method = 'aggregate_only_no_peer_store_ids'",
    `INSERT INTO peer_groups (
       peer_group_id,
       snapshot_date,
       segment_label,
       metric_id,
       metric_window,
       min_peer_store_count,
       peer_store_count,
       sample_status,
       deidentification_method,
       evidence_refs
     ) VALUES (
       'peer_group:db-migration-check:invalid-deidentification',
       '2026-05-03',
       'independent_cafe_core',
       'avg_order_value',
       'snapshot',
       3,
       3,
       'sufficient',
       'raw_peer_store_ids',
       ARRAY['evidence:db-migration-check']
     )`,
  );

  await expectCheckViolation(
    client,
    'min_peer_store_count >= 3',
    `INSERT INTO peer_groups (
       peer_group_id,
       snapshot_date,
       segment_label,
       metric_id,
       metric_window,
       min_peer_store_count,
       peer_store_count,
       sample_status,
       deidentification_method,
       evidence_refs
     ) VALUES (
       'peer_group:db-migration-check:invalid-min-peer-floor',
       '2026-05-03',
       'independent_cafe_core',
       'avg_order_value',
       'snapshot',
       2,
       2,
       'weak_sample',
       'aggregate_only_no_peer_store_ids',
       ARRAY['evidence:db-migration-check']
     )`,
  );
}

async function main() {
  const url = databaseUrl();
  assertResetTargetIsTestOnly(url);
  await waitForPostgres(url);
  await resetPublicSchema(url);
  console.log('Reset public schema in local/CI test database.');
  await runMigrationRunner(url);

  await withClient(url, 'data-dyna-db-migration-check-assertions', async (client) => {
    await assertTablesExist(client);
    await assertBusinessMutationConstraint(client);
    await assertEvidenceClaimsConstraint(client);
    await assertFinalFactSourceConstraint(client);
    await assertMemberRfmSourceTableConstraint(client);
    await assertPeerBenchmarkConstraints(client);
  });

  console.log('DB migration integration check passed: table catalog and required PostgreSQL constraints verified.');
}

main().catch((error) => {
  console.error(`DB migration integration check failed: ${error.message}`);
  process.exitCode = 1;
});
