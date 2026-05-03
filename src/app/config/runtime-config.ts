import { z } from "zod";

const RuntimeEnvironmentSchema = z.enum(["local", "test"]);

const RuntimeConfigSchema = z.object({
  runtimeEnvironment: RuntimeEnvironmentSchema.default("local"),
  httpHost: z.string().trim().min(1).default("127.0.0.1"),
  httpPort: z.preprocess(
    (value) => (value === undefined ? 3000 : value),
    z.coerce.number().int().min(1).max(65535),
  ),
});

export type RuntimeEnvironment = z.infer<typeof RuntimeEnvironmentSchema>;
export type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>;

const envNameByConfigField: Record<keyof RuntimeConfig, string> = {
  runtimeEnvironment: "DATA_DYNA_RUNTIME_ENV",
  httpHost: "DATA_DYNA_HTTP_HOST",
  httpPort: "DATA_DYNA_HTTP_PORT",
};

export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const parsed = RuntimeConfigSchema.safeParse({
    runtimeEnvironment: env.DATA_DYNA_RUNTIME_ENV,
    httpHost: env.DATA_DYNA_HTTP_HOST,
    httpPort: env.DATA_DYNA_HTTP_PORT,
  });

  if (!parsed.success) {
    throw new Error(formatRuntimeConfigError(parsed.error));
  }

  return parsed.data;
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
