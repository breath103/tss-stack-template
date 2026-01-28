import { parseArgs } from "node:util";

import { askConfirmation, parseDuration, sleep } from "shared/cli-utils";
import { loadConfig } from "shared/config";

import { CloudWatchLogsClient, FilterLogEventsCommand, ResourceNotFoundException } from "@aws-sdk/client-cloudwatch-logs";

import { EdgeStack } from "./lib/edge-stack.js";

const FETCH_LIMIT = 100;
const MAX_EVENTS_BEFORE_CONFIRMATION = 100;

type FunctionType = "origin-request" | "viewer-request";

interface CliArgs {
  function: FunctionType;
  startTime: number;
  tail: boolean;
  region: string;
}

async function main() {
  const args = parseCliArgs();
  const config = loadConfig();

  const { logGroupName, region } = getLogConfig(args.function, config.project, args.region);

  console.log(`${args.tail ? "Tailing" : "Fetching"} logs from ${logGroupName}...\n`);
  await fetchLogs(logGroupName, region, args.startTime, args.tail);
}

function getLogConfig(fn: FunctionType, project: string, argRegion: string): { logGroupName: string; region: string } {
  switch (fn) {
    case "origin-request": {
      const functionName = EdgeStack.originRequestFunctionName({ project });
      return { logGroupName: `/aws/lambda/${EdgeStack.region}.${functionName}`, region: argRegion };
    }
    case "viewer-request": {
      const functionName = EdgeStack.viewerRequestFunctionName({ project });
      return { logGroupName: `/aws/cloudfront/function/${functionName}`, region: EdgeStack.region };
    }
  }
}

function parseCliArgs(): CliArgs {
  const { values } = parseArgs({
    options: {
      function: { type: "string", short: "f" },
      startTime: { type: "string", short: "s" },
      tail: { type: "boolean", short: "t" },
      region: { type: "string", short: "r" },
      help: { type: "boolean", short: "h" },
    },
    strict: true,
  });

  if (values.help) {
    console.log(`
Usage: npm run logs -- [options]

Fetch or tail CloudWatch logs for edge functions

Options:
  -f, --function <fn>     Function: origin-request | viewer-request (required)
  -r, --region <region>   CloudWatch region to query (required for origin-request)
                          Logs are stored in the region where the edge executed
  -s, --startTime <dur>   How far back to fetch logs (default: 1m)
                          Format: <number><unit> where unit is s/m/h/d
                          Examples: 30s, 5m, 1h, 7d
  -t, --tail              Keep tailing logs (default: fetch once and exit)
  -h, --help              Show this help message

Examples:
  npm run logs -- -f origin-request -r us-east-1
  npm run logs -- -f origin-request -r us-west-2 -s 30m -t
  npm run logs -- -f viewer-request                       # always us-east-1
  npm run logs -- -f viewer-request -s 10m -t
`);
    process.exit(0);
  }

  if (!values.function) {
    console.error("Error: --function is required");
    process.exit(1);
  }

  if (values.function !== "origin-request" && values.function !== "viewer-request") {
    console.error("Error: --function must be origin-request or viewer-request");
    process.exit(1);
  }

  if (values.function === "origin-request" && !values.region) {
    console.error("Error: --region is required for origin-request (Lambda@Edge logs are regional)");
    process.exit(1);
  }

  return {
    function: values.function as FunctionType,
    startTime: parseDuration(values.startTime ?? "1m"),
    tail: values.tail ?? false,
    region: values.region ?? "us-east-1",
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
          console.log("Log group not found. Function may not have executed yet.");
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
