#!/usr/bin/env -S node --import tsx
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { resolveBin } from "shared/cli-utils";

// The per-package lint scripts only run biome over their own `src`/`scripts`;
// this covers every other file in the repo (shared, edge, modules, skills, config).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fix = process.argv.includes("--fix");

const biome = spawnSync(resolveBin("biome", ROOT), ["check", ...(fix ? ["--write", "--unsafe"] : []), "."], {
  stdio: "inherit",
  cwd: ROOT,
});
if (biome.error) throw biome.error;
process.exit(biome.status ?? 1);
