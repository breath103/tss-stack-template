import path from "path";
import { config as dotenvConfig } from "dotenv";
import { loadAndValidateEnv } from "@app/shared/env-parser";

const ROOT = path.resolve(import.meta.dirname, "../..");

export function loadEnv(env: string | undefined): Record<string, string> {
  const envFile = env ? `.env.${env}` : ".env";
  dotenvConfig({ path: path.join(ROOT, envFile) });
  console.log(`Loaded environment from ${envFile}`);

  console.log("Validating environment variables...");
  const envVars = loadAndValidateEnv(path.join(ROOT, "src/env.d.ts"));
  console.log("Environment variables OK\n");

  return envVars;
}
