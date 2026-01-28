import { parseArgs } from "node:util";

import { sanitizeBranchName } from "shared/branch";
import { askConfirmation, parseDuration, sleep } from "shared/cli-utils";
import { loadConfig } from "shared/config";

import { CloudWatchLogsClient, FilterLogEventsCommand, ResourceNotFoundException } from "@aws-sdk/client-cloudwatch-logs";

import { BackendStack } from "./lib/backend-stack.js";

const FETCH_LIMIT = 100;
const MAX_EVENTS_BEFORE_CONFIRMATION = 100;

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
                          Format: <number><unit> where unit is s/m/h/d
                          Examples: 30s, 5m, 1h, 7d
  -t, --tail              Keep tailing logs (default: fetch once and exit)
  -h, --help              Show this help message

Examples:
  npm run logs -- -n main                  # Last 1 minute, exit
  npm run logs -- -n main -t               # Last 1 minute, keep tailing
  npm run logs -- -n main -s 30m           # Last 30 minutes, exit
  npm run logs -- -n main -s 1d -t         # Last 1 day, keep tailing
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

  return {
    name: sanitized,
    startTime: parseDuration(values.startTime ?? "1m"),
    tail: values.tail ?? false,
  };
}

async function fetchLogs(logGroupName: string, region: string, startTime: number, tail: boolean): Promise<void> {
  const logs = new CloudWatchLogsClient({ region });
  let totalEvents = 0;
  let askedConfirmation = false;
  let nextToken: string | undefined;

  while (true) {
    try {
      const response = await logs.send(
        new FilterLogEventsCommand({ logGroupName, startTime, nextToken, limit: FETCH_LIMIT })
      );

      const events = response.events ?? [];

      for (const event of events) {
        const ts = new Date(event.timestamp!).toISOString();
        const msg = event.message?.trimEnd() ?? "";
        console.log(`${ts}  ${msg}`);
        startTime = event.timestamp! + 1;
      }

      totalEvents += events.length;
      nextToken = response.nextToken;

      // If we've hit the threshold and there's more, ask for confirmation
      if (totalEvents >= MAX_EVENTS_BEFORE_CONFIRMATION && nextToken && !askedConfirmation) {
        const lastTs = events.at(-1)?.timestamp;
        const lastTime = lastTs ? new Date(lastTs).toISOString() : "N/A";
        const confirmed = await askConfirmation(
          `\nRead ${totalEvents} events so far (last: ${lastTime}). Continue until now? (y/n): `
        );
        if (!confirmed) {
          console.log("Stopped.");
          return;
        }
        askedConfirmation = true;
      }

      if (nextToken) continue;
      if (!tail) return;
      await sleep(1000);
    } catch (err) {
      if (err instanceof ResourceNotFoundException) {
        if (!tail) {
          console.log("Log group not found.");
          return;
        }
        console.log("Waiting for log group to be created...");
        await sleep(1000);
      } else {
        throw err;
      }
    }
  }
}

main();
