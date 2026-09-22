// Fail fast, with the exact remedy, when the workspace isn't provisioned —
// instead of letting a stale/half-installed tree surface minutes later as a
// cryptic `Cannot find module 'recharts'`, an ERR_MODULE_NOT_FOUND crash-loop,
// or a dev server that hangs the full readiness timeout.
//
// Runs at the top of `scripts/dev.ts`, so both the foreground and the
// background `start` path bail here in milliseconds before spawning anything.

import fs from "node:fs";
import path from "node:path";

// Root package-lock is written a hair after node_modules/.package-lock.json in
// the same `npm install`, and their write order within a reify isn't
// guaranteed. Tolerate sub-second skew so a clean install never reads as stale;
// a real "you pulled new deps" gap is minutes, not milliseconds.
const STALE_TOLERANCE_MS = 2000;

export function ensureDeps(repoRoot: string = process.cwd()): void {
  const stale = stalenessReason(repoRoot);
  if (stale) throw provisioningError(stale);

  const unlinked = unlinkedWorkspaces(repoRoot);
  if (unlinked.length > 0) {
    throw provisioningError(`workspace packages aren't linked into node_modules (${unlinked.join(", ")})`);
  }
}

// `git pull` rewrites package-lock.json but never touches node_modules, so a
// stale tree silently breaks imports for freshly-added deps. npm records the
// tree it last reified in node_modules/.package-lock.json (the "hidden
// lockfile") — comparing the two LOCKFILES is npm's own up-to-date signal.
// Comparing against the node_modules FOLDER mtime instead is wrong: npm only
// bumps it when a top-level entry changes and always writes it a few ms before
// the lockfile, so it both misses real staleness and misfires after a clean
// install.
function stalenessReason(repoRoot: string): string | null {
  const lock = path.join(repoRoot, "package-lock.json");
  if (!fs.existsSync(lock)) return null;

  const modules = path.join(repoRoot, "node_modules");
  if (!fs.existsSync(modules)) return "node_modules is missing";

  const installed = path.join(modules, ".package-lock.json");
  if (!fs.existsSync(installed)) return "node_modules was never installed by npm (no hidden lockfile)";

  if (fs.statSync(lock).mtimeMs > fs.statSync(installed).mtimeMs + STALE_TOLERANCE_MS) {
    return "node_modules is out of date with package-lock.json";
  }
  return null;
}

// Every workspace package (each `<dir>/*` glob in package.json "workspaces") is
// symlinked into node_modules/<name> by a complete `npm install`. A missing or
// dangling link means the install never finished wiring the workspace — a
// package that imports it then crash-loops on ERR_MODULE_NOT_FOUND and dev
// hangs the full readiness timeout. existsSync follows the symlink, so a
// dangling link reads as missing too.
/** Parsed JSON as a plain object, or null when the file is missing, malformed or not an object. */
function readJsonObject(file: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf-8"));
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function unlinkedWorkspaces(repoRoot: string): string[] {
  const rootPkg = path.join(repoRoot, "package.json");
  if (!fs.existsSync(rootPkg)) return [];
  const workspaces = readJsonObject(rootPkg)?.workspaces;
  const globs = Array.isArray(workspaces) ? workspaces.filter(g => typeof g === "string") : [];

  const missing: string[] = [];
  for (const glob of globs) {
    if (!glob.endsWith("/*")) continue; // only the "<dir>/*" form workspaces use
    const dir = path.join(repoRoot, glob.slice(0, -2));
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) {
      const pkgJson = path.join(dir, entry, "package.json");
      if (!fs.existsSync(pkgJson)) continue;
      const name = readJsonObject(pkgJson)?.name;
      if (typeof name === "string" && !fs.existsSync(path.join(repoRoot, "node_modules", ...name.split("/")))) {
        missing.push(name);
      }
    }
  }
  return missing;
}

function provisioningError(problem: string): Error {
  return new Error(
    `\n  ✗ Dependencies not provisioned: ${problem}.\n` +
      `    This is a stale/fresh worktree, not a code bug — don't start debugging.\n` +
      `    Fix: run  npm install\n`
  );
}
