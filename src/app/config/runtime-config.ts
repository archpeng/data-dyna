import { z } from "zod";

const RuntimeEnvironmentSchema = z.enum(["local", "test"]);

const RuntimeDatabaseUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => ["postgresql:", "postgres:"].includes(new URL(value).protocol), {
    message: "database URL must use postgres:// or postgresql://",
  });

const RuntimeConfigSchema = z.object({
  runtimeEnvironment: RuntimeEnvironmentSchema.default("local"),
  httpHost: z.string().trim().min(1).default("127.0.0.1"),
  httpPort: z.preprocess(
    (value) => (value === undefined ? 3000 : value),
    z.coerce.number().int().min(1).max(65535),
  ),
  databaseUrl: z.preprocess(
    (value) => (value === undefined || value === "" ? undefined : value),
    RuntimeDatabaseUrlSchema.optional(),
  ),
});

export type RuntimeEnvironment = z.infer<typeof RuntimeEnvironmentSchema>;
export type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>;

const envNameByConfigField: Record<keyof RuntimeConfig, string> = {
  runtimeEnvironment: "DATA_DYNA_RUNTIME_ENV",
  httpHost: "DATA_DYNA_HTTP_HOST",
  httpPort: "DATA_DYNA_HTTP_PORT",
  databaseUrl: "DATA_DYNA_DATABASE_URL",
};

export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const parsed = RuntimeConfigSchema.safeParse({
    runtimeEnvironment: env.DATA_DYNA_RUNTIME_ENV,
    httpHost: env.DATA_DYNA_HTTP_HOST,
    httpPort: env.DATA_DYNA_HTTP_PORT,
    databaseUrl: env.DATA_DYNA_DATABASE_URL,
  });

  if (!parsed.success) {
    throw new Error(formatRuntimeConfigError(parsed.error));
  }

  return parsed.data;
}

export function requireRuntimeDatabaseUrl(config: RuntimeConfig): string {
  if (!config.databaseUrl) {
    throw new Error(
      "Invalid Data Dyna local/test runtime config: DATA_DYNA_DATABASE_URL is required for PostgreSQL-backed event routes.",
    );
  }

  return config.databaseUrl;
}

function formatRuntimeConfigError(error: z.ZodError): string {
  const details = error.issues
    .map((issue) => {
      const field = issue.path[0] as keyof RuntimeConfig | undefined;
      const envName = field ? envNameByConfigField[field] : undefined;
      return `${envName ?? issue.path.join(".")}: ${issue.message}`;
    })
    .join("; ");

  return `Invalid Data Dyna local/test runtime config: ${details}`;
}
