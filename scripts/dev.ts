import { spawn } from "node:child_process";
import { parseArgs } from "node:util";

import open from "open";

import { loadConfig } from "@app/shared/config";

function main() {
  const envArg = parseCliArgs();
  const envFlag = envArg ? ` -- --env=${envArg}` : "";

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

  const child = spawn(fullCommand, {
    stdio: ["inherit", "pipe", "pipe"],
    shell: true,
  });

  // Track which servers are ready
  let backendReady = false;
  let frontendReady = false;
  let browserOpened = false;

  const config = loadConfig();

  const checkAndOpenBrowser = () => {
    if (backendReady && frontendReady && !browserOpened) {
      browserOpened = true;
      console.log("\nAll servers ready, opening browser...\n");
      open(`http://localhost:${config.edge.devPort}`);
    }
  };

  const handleOutput = (data: Buffer) => {
    const text = data.toString();
    process.stdout.write(data);

    if (text.includes("Backend running on")) {
      backendReady = true;
      checkAndOpenBrowser();
    }
    if (text.includes("VITE") && text.includes("ready in")) {
      frontendReady = true;
      checkAndOpenBrowser();
    }
  };

  child.stdout?.on("data", handleOutput);
  child.stderr?.on("data", (data) => process.stderr.write(data));

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      env: { type: "string", short: "e" },
      help: { type: "boolean", short: "h" },
    },
    strict: false,
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
