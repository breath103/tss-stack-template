#!/usr/bin/env -S node --import tsx
// Open a URL for the user: an Orca browser tab in this session's worktree when
// running inside Orca, the platform opener otherwise.
//
//   ./scripts/open-url.ts "http://localhost:4010/tasks"
//   ./scripts/open-url.ts --activate "<pr-url>"   # also make the Orca tab active
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  options: { activate: { type: "boolean", default: false } },
  allowPositionals: true,
});
const url = positionals[0];
if (!url) {
  console.error("Usage: ./scripts/open-url.ts [--activate] <url>");
  process.exit(1);
}

function run(cmd: string, args: string[], capture = false): string {
  const res = spawnSync(cmd, args, { encoding: "utf-8", stdio: capture ? "pipe" : "inherit" });
  if (res.error) {
    console.error(`open-url: could not run ${cmd}: ${res.error.message}`);
    process.exit(1);
  }
  if (res.status !== 0) {
    if (capture) process.stderr.write(res.stderr);
    process.exit(res.status ?? 1);
  }
  return res.stdout ?? "";
}

if (!process.env.ORCA_TAB_ID) {
  run(process.platform === "darwin" ? "open" : "xdg-open", [url]);
  process.exit(0);
}

const worktree = process.env.ORCA_WORKTREE_ID ? ["--worktree", `id:${process.env.ORCA_WORKTREE_ID}`] : [];
const created = JSON.parse(run("orca", ["tab", "create", "--url", url, ...worktree, "--json"], true));
const pageId: string | undefined = created.result?.browserPageId;
if (values.activate && pageId) run("orca", ["tab", "switch", "--page", pageId, "--json"], true);
