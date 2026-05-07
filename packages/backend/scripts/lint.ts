#!/usr/bin/env -S node --import tsx
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const useCache = !args.includes("--no-cache");
const eslint = [
  path.join(ROOT, "node_modules/.bin/eslint"),
  path.join(ROOT, "../../node_modules/.bin/eslint"),
].find(existsSync);

if (!eslint) {
  throw new Error("Could not find eslint. Run npm install from the repo root.");
}

const cacheDir = path.join(ROOT, "../../node_modules/.cache/eslint/backend");

const eslintArgs = [
  "src",
  "scripts",
];

if (useCache) {
  mkdirSync(cacheDir, { recursive: true });
  eslintArgs.push(
    "--cache",
    "--cache-strategy",
    "content",
    "--cache-location",
    path.join(cacheDir, ".eslintcache"),
  );
}

eslintArgs.push(...args);

const result = spawnSync(eslint, eslintArgs, {
  stdio: "inherit",
  cwd: ROOT,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
