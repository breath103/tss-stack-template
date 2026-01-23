import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

function main() {
  const envArg = parseCliArgs();
  const envFlag = envArg ? ` -- --env=${envArg}` : "";

  // Build commands with optional env flag
  const commands = [
    `"npm run dev -w @app/edge${envFlag}"`,
    `"npm run dev -w @app/backend${envFlag}"`,
    `"npm run dev:types -w @app/backend"`,
    `"npm run dev -w @app/frontend${envFlag}"`,
  ].join(" ");

  const fullCommand = [
    "npx concurrently",
    "--kill-others",
    "-n edge,backend,types,frontend",
    "-c magenta,blue,yellow,green",
    commands,
  ].join(" ");

  // Using spawnSync with shell - signals are properly forwarded to the shell process
  // and concurrently's --kill-others handles cleaning up child processes
  const result = spawnSync(fullCommand, {
    stdio: "inherit",
    shell: true,
  });

  process.exit(result.status ?? 0);
}

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      env: { type: "string", short: "e" },
      help: { type: "boolean", short: "h" },
    },
    strict: false, // Allow other flags to pass through
  });

  if (values.help) {
    showHelp();
  }

  return values.env;
}

function showHelp(): never {
  console.log(`
Usage: npm run dev -- [options]

Start all dev servers (edge, backend, frontend)

Options:
  -e, --env <env>     Environment file suffix (optional)
                      Loads .env.<env> instead of .env in all packages
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
