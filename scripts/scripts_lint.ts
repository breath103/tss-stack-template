#!/usr/bin/env -S node --import tsx
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runLint } from "shared/lint";

// Lints the root `scripts/` tree with the same linters as the packages. Sibling of
// `e2e_lint.ts`; without it this tree is linted and formatted by nothing.
const SCRIPTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

runLint({
  cwd: SCRIPTS_DIR,
  targets: ["."],
  args: process.argv.slice(2),
});
