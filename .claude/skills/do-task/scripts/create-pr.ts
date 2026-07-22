import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { loadConfig } from "./lib.ts";

export function createPr(args: string[]): void {
  const { values } = parseArgs({
    args,
    options: {
      title: { type: "string" },
      "body-file": { type: "string" },
      issue: { type: "string" },
      reviewer: { type: "string" },
      draft: { type: "boolean", default: false },
    },
    strict: true,
  });

  if (!values.title || !values["body-file"] || !values.issue) {
    console.error("Usage: create-pr --title <title> --body-file <path> --issue <issue-number> [--reviewer <user>] [--draft]");
    process.exit(1);
  }

  const body = readFileSync(values["body-file"], "utf-8");

  const config = loadConfig();

  // Append "Closes #N" to body to link PR to issue
  const closeRef = `Closes #${values.issue}`;
  const fullBody = body.includes(closeRef) ? body : `${body}\n\n${closeRef}`;

  const createArgs = [
    "pr", "create",
    "--repo", config.repo,
    "--title", values.title,
    "--body", fullBody,
  ];
  if (values.reviewer) createArgs.push("--reviewer", values.reviewer);
  if (values.draft) createArgs.push("--draft");

  const prUrl = execFileSync("gh", createArgs, { encoding: "utf-8" }).trim();

  // Extract PR number from URL
  const prNumber = prUrl.match(/\/pull\/(\d+)/)?.[1] ?? null;

  console.log(JSON.stringify({ url: prUrl, number: prNumber, issue: values.issue, linked: true }));
}
