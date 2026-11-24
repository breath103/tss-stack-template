import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { loadConfig, requireGuidesRechecked, requireUpToDateWithMain } from "./lib.ts";

export const CREATE_PR_USAGE =
  "create-pr --title <title> --issue <issue-number> (--body <body> | --body-file <path>) [--reviewer <user>] [--draft]\n" +
  "  Pushes the current branch first.";

export function createPr(args: string[]): void {
  const { values } = parseArgs({
    args,
    options: {
      title: { type: "string" },
      body: { type: "string" },
      "body-file": { type: "string" },
      issue: { type: "string" },
      reviewer: { type: "string" },
      draft: { type: "boolean", default: false },
    },
    strict: true,
  });

  const body = values["body-file"] ? readFileSync(values["body-file"], "utf-8") : values.body;
  if (!values.title || !body || !values.issue) {
    console.error(`Usage: ${CREATE_PR_USAGE}`);
    process.exit(1);
  }

  requireUpToDateWithMain();
  requireGuidesRechecked();

  const config = loadConfig();

  // Append "Closes #N" to body to link PR to issue
  const closeRef = `Closes #${values.issue}`;
  const fullBody = body.includes(closeRef) ? body : `${body}\n\n${closeRef}`;

  // `gh pr create` fails on a branch with no upstream. git's output goes to stderr so
  // stdout stays the single JSON line callers parse.
  execFileSync("git", ["push", "--set-upstream", "origin", "HEAD"], { stdio: ["ignore", 2, 2] });

  const createArgs = ["pr", "create", "--repo", config.repo, "--title", values.title, "--body", fullBody];
  if (values.reviewer) createArgs.push("--reviewer", values.reviewer);
  if (values.draft) createArgs.push("--draft");

  const prUrl = execFileSync("gh", createArgs, { encoding: "utf-8" }).trim();

  // Extract PR number from URL
  const prNumber = prUrl.match(/\/pull\/(\d+)/)?.[1] ?? null;

  console.log(JSON.stringify({ url: prUrl, number: prNumber, issue: values.issue, linked: true }));
}
