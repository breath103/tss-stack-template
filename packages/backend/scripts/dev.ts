import { watch } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { loadConfig } from "@app/shared/config";
import { serve } from "@hono/node-server";

import { loadEnv } from "./lib/env.js";

async function main() {
  const env = parseCliArgs();

  loadEnv(env);

  // Watch .env file for changes
  const envFile = typeof env === "string" ? `.env.${env}` : ".env";
  const envPath = path.join(import.meta.dirname, "..", envFile);
  watchEnvFile(envPath);

  // Dynamic import AFTER env is loaded
  const { app } = await import("../src/index.js");

  const config = loadConfig();
  const port = config.backend.devPort;
  console.log(`Backend running on http://localhost:${port}`);
  serve({ fetch: app.fetch, port });
}

function watchEnvFile(envPath: string) {
  let debounceTimer: NodeJS.Timeout | null = null;

  watch(envPath, () => {
    // Debounce to avoid multiple restarts for rapid changes
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      console.log(`\nEnv file changed: ${path.basename(envPath)}`);
      console.log("Restarting backend server...\n");
      process.exit(0); // tsx watch will restart the process
    }, 100);
  });
}

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      env: { type: "string", short: "e" },
      help: { type: "boolean", short: "h" },
    },
    strict: true,
  });

  if (values.help) {
    showHelp();
  }

  return values.env;
}

function showHelp(): never {
  console.log(`
Usage: npm run dev -- [options]

Start backend dev server

Options:
  -e, --env <env>     Environment file suffix (optional)
                      Loads .env.<env> instead of .env
                      Example: --env=production loads .env.production
  -h, --help          Show this help message

Examples:
  npm run dev
  npm run dev -- --env=production
  npm run dev -- -e staging
`);
  process.exit(0);
}

main();
