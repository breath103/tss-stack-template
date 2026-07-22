import { parseArgs } from "node:util";
import { loadConfig, saveConfig, fetchProjectConfig } from "./lib.ts";

export function setup(args: string[]): void {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: "string" },
      repo: { type: "string" },
    },
    strict: true,
  });

  if (!values.project || !values.repo) {
    console.error("Usage: setup --project <project-url> --repo <owner/repo>");
    process.exit(1);
  }

  const config = fetchProjectConfig(values.project, values.repo);
  saveConfig(config);
  console.log(JSON.stringify(config, null, 2));
}

export function refresh(): void {
  const existing = loadConfig();
  const config = fetchProjectConfig(existing.project, existing.repo);
  saveConfig(config);
  console.log(JSON.stringify(config, null, 2));
}
