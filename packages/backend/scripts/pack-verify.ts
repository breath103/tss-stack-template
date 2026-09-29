#!/usr/bin/env -S node --import tsx
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const DIST = path.resolve(import.meta.dirname, "../dist");

function readJson<T>(file: string) {
  return JSON.parse(readFileSync(path.join(DIST, file), "utf8")) as T;
}

function main() {
  const manifest = readJson<{ dependencies: Record<string, string> }>("package.json");
  const lock = readJson<{ packages: Record<string, { version: string }> }>("package-lock.json");
  assert.deepEqual(
    lock.packages[""].dependencies,
    manifest.dependencies,
    "Deployment lockfile is stale. Run ./packages/backend/scripts/pack-build.ts && ./packages/backend/scripts/pack-install.ts --update-lock, then commit packages/backend/package-lock.deploy.json"
  );
  for (const name of Object.keys(manifest.dependencies)) {
    assert.equal(
      readJson<{ version: string }>(`node_modules/${name}/package.json`).version,
      lock.packages[`node_modules/${name}`].version,
      `${name} differs from the lockfile`
    );
  }
  console.log("Verified locked dependencies.");
}

main();
