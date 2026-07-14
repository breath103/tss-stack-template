#!/usr/bin/env -S node --import tsx
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runLint } from "shared/lint";

// Lints the top-level `e2e/` tree with the same linters as the packages:
// oxlint (correctness + type-aware, reads `e2e/.oxlintrc.json`) then biome.
const E2E_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "e2e");

runLint({
  cwd: E2E_DIR,
  targets: ["."],
  args: process.argv.slice(2),
});
