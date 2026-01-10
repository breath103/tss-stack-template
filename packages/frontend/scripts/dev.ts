import path from "path";
import { parseArgs } from "util";
import { execSync } from "child_process";
import { config as dotenvConfig } from "dotenv";

const ROOT = path.resolve(import.meta.dirname, "..");

function main() {
  const env = parseCliArgs();

  const envFile = typeof env === "string" ? `.env.${env}` : ".env";
  dotenvConfig({ path: path.join(ROOT, envFile) });
  console.log(`Loaded environment from ${envFile}`);

  execSync("vite", { stdio: "inherit", env: process.env });
}

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      env: { type: "string", short: "e" },
      help: { type: "boolean", short: "h" },
    },
    strict: false, // Allow other flags to pass through to vite
  });

  if (values.help) {
    showHelp();
  }

  return values.env;
}

function showHelp(): never {
  console.log(`
Usage: npm run dev -- [options]

Start frontend dev server

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
