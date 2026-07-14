#!/usr/bin/env -S node --import tsx
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Lints the top-level `e2e/` tree with the same two linters as the packages:
// oxlint (correctness + type-aware, reads `e2e/.oxlintrc.json`) then biome
// (formatting, import order). `--fix` fixes both; `--no-cache` is accepted and
// ignored for backwards compatibility.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const E2E_DIR = path.join(REPO_ROOT, "e2e");

const args = process.argv.slice(2);
const fix = args.includes("--fix");
const passthrough = args.filter(a => a !== "--fix" && a !== "--no-cache");

function bin(name: string): string {
  const p = path.join(REPO_ROOT, "node_modules/.bin", name);
  if (!existsSync(p)) {
    throw new Error(`Could not find ${name}. Run npm install from the repo root.`);
  }
  return p;
}

const oxlint = spawnSync(
  bin("oxlint"),
  ["--type-aware", ".", ...(fix ? ["--fix"] : []), ...passthrough],
  { stdio: "inherit", cwd: E2E_DIR },
);
if (oxlint.error) throw oxlint.error;

const biome = spawnSync(
  bin("biome"),
  ["check", ...(fix ? ["--write", "--unsafe"] : []), "."],
  { stdio: "inherit", cwd: E2E_DIR },
);
if (biome.error) throw biome.error;

process.exit((oxlint.status ?? 1) || (biome.status ?? 1));
