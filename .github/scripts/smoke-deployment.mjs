import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { sanitizeBranchName } from "shared/branch";
import { loadConfig } from "shared/config";

import { BackendStack } from "../../packages/backend/scripts/lib/backend-stack.ts";

async function main() {
  const config = loadConfig();
  if (!process.env.DEPLOY_NAME) throw new Error("DEPLOY_NAME is required");
  const name = sanitizeBranchName(process.env.DEPLOY_NAME);
  const stack = BackendStack.id({ project: config.project, name });
  const url = execFileSync(
    "aws",
    [
      "cloudformation",
      "describe-stacks",
      "--stack-name",
      stack,
      "--query",
      "Stacks[0].Outputs[?OutputKey=='EndpointUrl'].OutputValue | [0]",
      "--output",
      "text",
      "--region",
      config.backend.region,
    ],
    { encoding: "utf8" }
  ).trim();
  assert.match(new URL(url).hostname, /\.lambda-web\.[a-z0-9-]+\.on\.aws$/);

  const health = await fetch(new URL("api/health", url), { signal: AbortSignal.timeout(30000) });
  assert.equal(health.status, 200, "Lambda health endpoint");
  assert.equal((await health.json()).status, "ok");
  const session = await fetch(new URL("api/auth/get-session", url), { signal: AbortSignal.timeout(30000) });
  assert.equal(session.status, 200, "Auth handler initializes successfully");
  assert.equal(await session.json(), null, "Anonymous caller has no session");

  const summary = `${name} Lambda: ${url}\n\nPassed: health, anonymous auth.\n`;
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
