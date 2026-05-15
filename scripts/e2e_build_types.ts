#!/usr/bin/env -S node --import tsx
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

function main(): void {
  const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
  const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
  execSync("npx tsc -p e2e/tsconfig.json", { cwd: REPO_ROOT, stdio: "inherit" });
}

main();
