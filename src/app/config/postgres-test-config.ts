import { z } from "zod";

const defaultDbName = "data_dyna_test";
const defaultDbUser = "data_dyna";
const defaultDbPassword = "data_dyna_local_password";
const defaultDbHost = "localhost";
const defaultDbPort = "55432";

const PostgresTestConfigSchema = z.object({
  databaseUrl: z.string().url().refine((value) => ["postgresql:", "postgres:"].includes(new URL(value).protocol), {
    message: "database URL must use postgres:// or postgresql://",
  }),
});

export type PostgresTestConfig = z.infer<typeof PostgresTestConfigSchema>;

export function loadPostgresTestConfig(env: NodeJS.ProcessEnv = process.env): PostgresTestConfig {
  const databaseUrl =
    env.DATA_DYNA_TEST_DATABASE_URL ??
    buildDatabaseUrl({
      dbName: env.DATA_DYNA_TEST_DB_NAME ?? defaultDbName,
      dbUser: env.DATA_DYNA_TEST_DB_USER ?? defaultDbUser,
      dbPassword: env.DATA_DYNA_TEST_DB_PASSWORD ?? defaultDbPassword,
      dbHost: env.DATA_DYNA_TEST_DB_HOST ?? defaultDbHost,
      dbPort: env.DATA_DYNA_TEST_DB_PORT ?? defaultDbPort,
    });

  const parsed = PostgresTestConfigSchema.safeParse({ databaseUrl });
  if (!parsed.success) {
    throw new Error(`Invalid Data Dyna PostgreSQL local/test config: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
  }

  assertLocalTestDatabase(parsed.data.databaseUrl);
  return parsed.data;
}

function buildDatabaseUrl(options: {
  dbName: string;
  dbUser: string;
  dbPassword: string;
  dbHost: string;
  dbPort: string;
}): string {
  const username = encodeURIComponent(options.dbUser);
  const password = encodeURIComponent(options.dbPassword);
  const database = encodeURIComponent(options.dbName);
  return `postgresql://${username}:${password}@${options.dbHost}:${options.dbPort}/${database}`;
}

function assertLocalTestDatabase(databaseUrl: string): void {
  const parsed = new URL(databaseUrl);
  const database = decodeURIComponent(parsed.pathname.slice(1));
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");

  if (database !== "data_dyna_test") {
    throw new Error("Invalid Data Dyna PostgreSQL local/test config: database must be data_dyna_test.");
  }

  if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    throw new Error("Invalid Data Dyna PostgreSQL local/test config: host must be localhost, 127.0.0.1, or ::1.");
  }
}
