import { execSync } from "node:child_process";
import path from "node:path";
import { parseArgs } from "node:util";

import { config as dotenvConfig } from "dotenv";

function main() {
  const env = parseCliArgs();

  // Load env vars before Vite starts (needed for vite.config.ts validation)
  const envFile = env ? `.env.${env}` : ".env";
  dotenvConfig({ path: path.resolve(import.meta.dirname, "..", envFile) });

  // Pass --mode to Vite for runtime env loading
  const modeFlag = env ? `--mode ${env}` : "";
  execSync(`vite ${modeFlag}`, { stdio: "inherit" });
}

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      env: { type: "string", short: "e" },
    },
    strict: false,
  });

  return values.env;
}

main();
