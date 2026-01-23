import { spawn } from "node:child_process";
import path from "node:path";
import { parseArgs } from "node:util";

import { config as dotenvConfig } from "dotenv";

const env = parseCliArgs();

const envFile = env ? `.env.${env}` : ".env";
dotenvConfig({ path: path.resolve(import.meta.dirname, "..", envFile) });

const args: string[] = env ? ["--mode", env] : [];
spawn("vite", args, { stdio: "inherit" });

function parseCliArgs() {
  const { values } = parseArgs({
    options: { env: { type: "string", short: "e" } },
    strict: false,
  });
  return values.env;
}
