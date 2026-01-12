import { parseArgs } from "node:util";

import { loadConfig } from "@app/shared/config";
import { serve } from "@hono/node-server";

import { loadEnv } from "./lib/env.js";

async function main() {
  const env = parseCliArgs();

  loadEnv(env);

  // Dynamic import AFTER env is loaded
  const { app } = await import("../src/index.js");

  const config = loadConfig();
  const port = config.backend.devPort;
  console.log(`Backend running on http://localhost:${port}`);
  serve({ fetch: app.fetch, port });
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
