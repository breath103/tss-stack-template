#!/usr/bin/env -S node --import tsx
// Open a URL for the user: an Orca browser tab when running inside Orca,
// the platform opener otherwise.
//
//   ./scripts/open-url.ts "http://localhost:4010/tasks"
import { spawnSync } from "node:child_process";

const url = process.argv[2];
if (!url) {
  console.error("Usage: ./scripts/open-url.ts <url>");
  process.exit(1);
}

const insideOrca = Boolean(process.env.ORCA_TAB_ID);
const [cmd, args] = insideOrca
  ? ["orca", ["tab", "create", "--url", url]]
  : [process.platform === "darwin" ? "open" : "xdg-open", [url]];

const res = spawnSync(cmd, args, { stdio: "inherit" });
if (res.error) {
  console.error(`open-url: could not run ${cmd}: ${res.error.message}`);
  process.exit(1);
}
process.exit(res.status ?? 1);
