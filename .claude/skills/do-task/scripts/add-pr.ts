import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { loadConfig } from "./lib.ts";

export function linkPr(args: string[]): void {
  const { values } = parseArgs({
    args,
    options: {
      pr: { type: "string" },
      issue: { type: "string" },
    },
    strict: true,
  });

  if (!values.pr || !values.issue) {
    console.error("Usage: link-pr --pr <pr-number> --issue <issue-number>");
    process.exit(1);
  }

  const config = loadConfig();

  // Get current PR body
  const prJson = execFileSync("gh", [
    "pr", "view", values.pr,
    "--repo", config.repo,
    "--json", "body",
  ], { encoding: "utf-8" });
  const { body } = JSON.parse(prJson);

  const closeRef = `Closes #${values.issue}`;
  if (body && body.includes(closeRef)) {
    console.log(JSON.stringify({ pr: values.pr, issue: values.issue, alreadyLinked: true }));
    return;
  }

  const newBody = body ? `${body}\n\n${closeRef}` : closeRef;

  execFileSync("gh", [
    "pr", "edit", values.pr,
    "--repo", config.repo,
    "--body", newBody,
  ], { encoding: "utf-8" });

  console.log(JSON.stringify({ pr: values.pr, issue: values.issue, linked: true }));
}
