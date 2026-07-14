#!/usr/bin/env -S node --import tsx
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

// Self-contained by design: this package is `type: module` while the repo-root
// `scripts/` tree is CommonJS, so a shared helper can't be imported cleanly
// across that boundary. The linters do the real work — oxlint (correctness +
// type-aware, reads `.oxlintrc.json`) then biome (formatting, import order,
// tailwind class order). `--fix` fixes both; `--no-cache` is accepted and
// ignored for backwards compatibility.
const ROOT = path.resolve(import.meta.dirname, "..");
const REPO_ROOT = path.resolve(ROOT, "../..");
const targets = ["src", "scripts"];

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
  ["--type-aware", ...targets, ...(fix ? ["--fix"] : []), ...passthrough],
  { stdio: "inherit", cwd: ROOT },
);
if (oxlint.error) throw oxlint.error;

const biome = spawnSync(
  bin("biome"),
  ["check", ...(fix ? ["--write", "--unsafe"] : []), ...targets],
  { stdio: "inherit", cwd: ROOT },
);
if (biome.error) throw biome.error;

process.exit((oxlint.status ?? 1) || (biome.status ?? 1));
