import { z } from "zod";

const RuntimeEnvironmentSchema = z.enum(["local", "test"]);

const RuntimeDatabaseUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => ["postgresql:", "postgres:"].includes(new URL(value).protocol), {
    message: "database URL must use postgres:// or postgresql://",
  });

const IngestionCredentialSchema = z.object({
  credentialId: z.string().trim().min(1),
  token: z.string().trim().min(1),
  merchantId: z.string().trim().min(1),
  storeIds: z.array(z.string().trim().min(1)).min(1),
  producer: z.object({
    service: z.string().trim().min(1),
    environment: z.string().trim().min(1),
  }),
  source: z.string().trim().min(1),
});

const IngestionCredentialsSchema = z.array(IngestionCredentialSchema).min(1).superRefine(assertUniqueCredentials);

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
  ingestionCredentials: IngestionCredentialsSchema.optional(),
});

export type RuntimeEnvironment = z.infer<typeof RuntimeEnvironmentSchema>;
export type IngestionCredential = z.infer<typeof IngestionCredentialSchema>;
export type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>;

const envNameByConfigField: Record<keyof RuntimeConfig, string> = {
  runtimeEnvironment: "DATA_DYNA_RUNTIME_ENV",
  httpHost: "DATA_DYNA_HTTP_HOST",
  httpPort: "DATA_DYNA_HTTP_PORT",
  databaseUrl: "DATA_DYNA_DATABASE_URL",
  ingestionCredentials: "DATA_DYNA_INGESTION_CREDENTIALS_JSON",
};

export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const parsedIngestionCredentials = parseOptionalJsonEnv(
    env.DATA_DYNA_INGESTION_CREDENTIALS_JSON,
    "DATA_DYNA_INGESTION_CREDENTIALS_JSON",
  );

  const parsed = RuntimeConfigSchema.safeParse({
    runtimeEnvironment: env.DATA_DYNA_RUNTIME_ENV,
    httpHost: env.DATA_DYNA_HTTP_HOST,
    httpPort: env.DATA_DYNA_HTTP_PORT,
    databaseUrl: env.DATA_DYNA_DATABASE_URL,
    ingestionCredentials: parsedIngestionCredentials,
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

export function requireIngestionCredentials(config: RuntimeConfig): IngestionCredential[] {
  if (!config.ingestionCredentials) {
    throw new Error(
      "Invalid Data Dyna local/test runtime config: DATA_DYNA_INGESTION_CREDENTIALS_JSON is required for authenticated event routes.",
    );
  }

  return config.ingestionCredentials;
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

function parseOptionalJsonEnv(value: string | undefined, envName: string): unknown {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Invalid Data Dyna local/test runtime config: ${envName}: must be valid JSON`);
  }
}

function assertUniqueCredentials(credentials: IngestionCredential[], context: z.RefinementCtx): void {
  addDuplicateCredentialIssues(credentials, context, "credentialId");
  addDuplicateCredentialIssues(credentials, context, "token");
}

function addDuplicateCredentialIssues(
  credentials: IngestionCredential[],
  context: z.RefinementCtx,
  field: "credentialId" | "token",
): void {
  const firstIndexByValue = new Map<string, number>();

  credentials.forEach((credential, index) => {
    const existingIndex = firstIndexByValue.get(credential[field]);
    if (existingIndex === undefined) {
      firstIndexByValue.set(credential[field], index);
      return;
    }

    context.addIssue({
      code: "custom",
      path: [index, field],
      message: `duplicate ${field}`,
    });
  });
}
