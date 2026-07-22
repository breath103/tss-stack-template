import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { loadConfig } from "./lib.ts";

export function commentPr(args: string[]): void {
  const { values } = parseArgs({
    args,
    options: {
      body: { type: "string" },
      pr: { type: "string" },
    },
    strict: true,
  });

  if (!values.body) {
    console.error("Usage: comment-pr --body <body> [--pr <number>]");
    process.exit(1);
  }

  const config = loadConfig();

  // If no --pr given, detect from current branch
  let prNumber = values.pr;
  if (!prNumber) {
    const prJson = execFileSync("gh", [
      "pr", "view",
      "--repo", config.repo,
      "--json", "number",
    ], { encoding: "utf-8" }).trim();
    prNumber = String(JSON.parse(prJson).number);
  }

  const commentUrl = execFileSync("gh", [
    "pr", "comment", prNumber,
    "--repo", config.repo,
    "--body", values.body,
  ], { encoding: "utf-8" }).trim();

  console.log(JSON.stringify({ url: commentUrl, pr: prNumber }));
}
