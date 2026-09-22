#!/usr/bin/env -S node --import tsx
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Typechecks the root `scripts/` tree. Sibling of `e2e_build_types.ts`; see
// `scripts/tsconfig.json` for why this tree needs its own program.
function main(): void {
  const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  execSync("npx tsc -p scripts/tsconfig.json", { cwd: REPO_ROOT, stdio: "inherit" });
}

main();
