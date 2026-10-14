#!/usr/bin/env -S node --import tsx
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");

function main() {
  const { values } = parseArgs({ options: { "update-lock": { type: "boolean", default: false } }, strict: true });
  const updateLock = values["update-lock"];
  console.log(
    updateLock ? "Updating Lambda dependency lockfile..." : "Installing locked dependencies for linux-arm64..."
  );
  execFileSync(
    "npm",
    [
      ...(updateLock ? ["install", "--package-lock-only"] : ["ci"]),
      "--include=optional",
      "--os=linux",
      "--cpu=arm64",
      "--omit=dev",
      "--force",
      "--no-workspaces",
      "--no-audit",
      "--no-fund",
    ],
    { cwd: DIST, stdio: "inherit" }
  );
  if (updateLock) fs.copyFileSync(path.join(DIST, "package-lock.json"), path.join(ROOT, "package-lock.deploy.json"));
  console.log("Pack install complete");
}

main();
