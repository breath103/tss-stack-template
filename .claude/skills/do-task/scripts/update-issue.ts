import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { loadConfig } from "./lib.ts";

export function updateIssue(args: string[]): void {
  const { values } = parseArgs({
    args,
    options: {
      issue: { type: "string" },
      title: { type: "string" },
      body: { type: "string" },
      "body-file": { type: "string" },
    },
    strict: true,
  });

  if (!values.issue) {
    console.error("Usage: update-issue --issue <number> [--title <title>] [--body <body> | --body-file <path>]");
    process.exit(1);
  }

  const body = values["body-file"] ? readFileSync(values["body-file"], "utf-8") : values.body;
  const config = loadConfig();

  const editArgs = ["issue", "edit", values.issue, "--repo", config.repo];
  if (values.title) editArgs.push("--title", values.title);
  if (body) editArgs.push("--body", body);

  execFileSync("gh", editArgs, { encoding: "utf-8" });

  console.log(JSON.stringify({ issue: values.issue, updated: true }));
}
