import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { loadConfig, resolveColumnId } from "./lib.ts";

export function createIssue(args: string[]): void {
  const { values } = parseArgs({
    args,
    options: {
      title: { type: "string" },
      body: { type: "string" },
      "body-file": { type: "string" },
      column: { type: "string" },
      label: { type: "string", multiple: true },
    },
    strict: true,
  });

  const body = values["body-file"] ? readFileSync(values["body-file"], "utf-8") : values.body;

  if (!values.title || !body) {
    console.error("Usage: create-issue --title <title> (--body <body> | --body-file <path>) [--column <status>] [--label <label>]");
    process.exit(1);
  }

  const config = loadConfig();

  const createArgs = [
    "issue", "create",
    "--repo", config.repo,
    "--title", values.title,
    "--body", body,
  ];
  for (const label of values.label ?? []) {
    createArgs.push("--label", label);
  }

  const issueUrl = execFileSync("gh", createArgs, { encoding: "utf-8" }).trim();

  const addResult = execFileSync("gh", [
    "project", "item-add", String(config.number),
    "--owner", config.owner,
    "--url", issueUrl,
    "--format", "json",
  ], { encoding: "utf-8" });
  const itemId = JSON.parse(addResult).id;

  if (values.column) {
    const optionId = resolveColumnId(config, values.column);
    execFileSync("gh", [
      "project", "item-edit",
      "--id", itemId,
      "--project-id", config.projectId,
      "--field-id", config.statusFieldId,
      "--single-select-option-id", optionId,
    ], { encoding: "utf-8" });
  }

  console.log(JSON.stringify({ id: itemId, url: issueUrl, status: values.column ?? null }));
}
