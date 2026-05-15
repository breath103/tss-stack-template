#!/usr/bin/env -S node --import tsx
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function main(): void {
  const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
  const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
  const E2E_DIR = path.join(REPO_ROOT, "e2e");
  const args = process.argv.slice(2);
  const useCache = !args.includes("--no-cache");
  const eslint = path.join(REPO_ROOT, "node_modules/.bin/eslint");

  if (!existsSync(eslint)) {
    throw new Error("Could not find eslint. Run npm install from the repo root.");
  }

  const cacheDir = path.join(REPO_ROOT, "node_modules/.cache/eslint/e2e");
  const eslintArgs = ["."];

  if (useCache) {
    mkdirSync(cacheDir, { recursive: true });
    eslintArgs.push("--cache", "--cache-strategy", "content", "--cache-location", path.join(cacheDir, ".eslintcache"));
  }

  eslintArgs.push(...args);

  const result = spawnSync(eslint, eslintArgs, { stdio: "inherit", cwd: E2E_DIR });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

main();
