import { parseArgs } from "node:util";

import { sanitizeBranchName } from "@app/shared/branch";
import { loadConfig } from "@app/shared/config";
import { CloudWatchLogsClient, FilterLogEventsCommand, ResourceNotFoundException } from "@aws-sdk/client-cloudwatch-logs";

import { BackendStack } from "./lib/backend-stack.js";

interface CliArgs {
  name: string;
  startTime: number;
  tail: boolean;
}

async function main() {
  const { name, startTime, tail } = parseCliArgs();
  const config = loadConfig();
  const region = config.backend.region;
  const functionName = BackendStack.functionName({ project: config.project, name });

  console.log(`${tail ? "Tailing" : "Fetching"} logs for ${functionName}...\n`);
  await fetchLogs(`/aws/lambda/${functionName}`, region, startTime, tail);
}

function parseCliArgs(): CliArgs {
  const { values } = parseArgs({
    options: {
      name: { type: "string", short: "n" },
      startTime: { type: "string", short: "s" },
      tail: { type: "boolean", short: "t" },
      help: { type: "boolean", short: "h" },
    },
    strict: true,
  });

  if (values.help) {
    console.log(`
Usage: npm run logs -- [options]

Fetch or tail CloudWatch logs for backend Lambda

Options:
  -n, --name <name>       Deployment name (required)
  -s, --startTime <dur>   How far back to fetch logs (default: 1m)
                          Format: <number><unit> where unit is s/m/h
                          Examples: 30s, 5m, 1h (max: 1h)
  -t, --tail              Keep tailing logs (default: fetch once and exit)
  -h, --help              Show this help message

Examples:
  npm run logs -- -n main                  # Last 1 minute, exit
  npm run logs -- -n main -t               # Last 1 minute, keep tailing
  npm run logs -- -n main -s 30m           # Last 30 minutes, exit
  npm run logs -- -n main -s 1h -t         # Last 1 hour, keep tailing
`);
    process.exit(0);
  }

  if (!values.name) {
    console.error("Error: --name is required");
    process.exit(1);
  }

  const sanitized = sanitizeBranchName(values.name);
  if (!sanitized) {
    console.error(`Error: invalid branch name "${values.name}"`);
    process.exit(1);
  }

  const startTime = parseDuration(values.startTime ?? "1m");

  return {
    name: sanitized,
    startTime,
    tail: values.tail ?? false,
  };
}

function parseDuration(input: string): number {
  const match = input.match(/^(\d+)(s|m|h)$/);
  if (!match) {
    console.error(`Error: invalid duration "${input}". Use format: <number><s|m|h>`);
    process.exit(1);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const ms = unit === "s" ? value * 1000 : unit === "m" ? value * 60_000 : value * 3600_000;
  const maxMs = 3600_000; // 1 hour

  if (ms > maxMs) {
    console.error("Error: max startTime is 1h");
    process.exit(1);
  }

  return Date.now() - ms;
}

async function fetchLogs(logGroupName: string, region: string, startTime: number, tail: boolean): Promise<void> {
  const logs = new CloudWatchLogsClient({ region });

  while (true) {
    try {
      const { events } = await logs.send(
        new FilterLogEventsCommand({ logGroupName, startTime, limit: 100 })
      );

      for (const event of events ?? []) {
        const ts = new Date(event.timestamp!).toISOString();
        const msg = event.message?.trimEnd() ?? "";
        console.log(`${ts}  ${msg}`);
        startTime = event.timestamp! + 1;
      }
    } catch (err) {
      if (err instanceof ResourceNotFoundException) {
        if (!tail) {
          console.log("Log group not found.");
          return;
        }
        console.log("Waiting for log group to be created...");
      } else {
        throw err;
      }
    }

    if (!tail) return;
    await sleep(1000);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main();
