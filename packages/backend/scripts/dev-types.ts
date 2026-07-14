#!/usr/bin/env -S node --import tsx
process.title = "dev:types";

import { execSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
execSync("npx tsc --watch --preserveWatchOutput --emitDeclarationOnly", {
  stdio: "inherit",
  cwd: ROOT,
});
