#!/usr/bin/env -S node --import tsx
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runLint } from "shared/lint";

// oxlint (correctness + type-aware, reads `.oxlintrc.json`) then biome
// (formatting, import order, tailwind class order). `--fix` fixes both;
// `--no-cache` is accepted and ignored for backwards compatibility.
runLint({
  cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  targets: ["src", "scripts"],
  args: process.argv.slice(2),
});
