#!/usr/bin/env -S node --import tsx
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { parseArgs } from "node:util";

import { loadConfig } from "shared/config";

import { DevProcess } from "./dev/dev-process.js";

const STATUS_FILE = path.join(process.cwd(), ".dev-status.json");
const GRACE_MS = 2000;
const READY_TIMEOUT_MS = 30_000;
const READY_POLL_MS = 300;

interface DevStatus {
  status: "starting" | "ready";
  url: string;
  pid: number;
}

function isAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

// Detached sh: once `target` exits, SIGTERMs its pgroup and SIGKILLs after
// grace. Lives in its own session so the pgroup blast doesn't take it down
// before it escalates.
function spawnReaper(target: number): void {
  spawn("sh", ["-c", `
    while kill -0 ${target} 2>/dev/null; do sleep 0.5; done
    kill -TERM -${target} 2>/dev/null
    sleep ${GRACE_MS / 1000}
    kill -KILL -${target} 2>/dev/null
  `], { stdio: "ignore", detached: true }).unref();
}

function readStatus(): DevStatus | null {
  try { return JSON.parse(fs.readFileSync(STATUS_FILE, "utf-8")); } catch { return null; }
}
function writeStatus(s: DevStatus) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify(s, null, 2) + "\n");
}
function deleteStatus() {
  try { fs.unlinkSync(STATUS_FILE); } catch { /* already gone */ }
}

switch (process.argv[2]) {
  case "status": cmdStatus(); break;
  case "stop": cmdStop(); break;
  case "start": void cmdStart(); break;
  default: void cmdForeground();
}

function cmdStatus() {
  const s = readStatus();
  if (!s) { console.log("not running"); process.exit(1); }
  console.log(`${s.status} | ${s.url} | pid:${s.pid}`);
}

function cmdStop() {
  const s = readStatus();
  if (!s) { console.log("not running"); return; }
  if (isAlive(s.pid)) {
    try { process.kill(-s.pid, "SIGTERM"); } catch { /* already dead */ }
  }
  deleteStatus();
  console.log("stopped");
}

async function cmdStart() {
  const stale = readStatus();
  if (stale) {
    if (isAlive(stale.pid)) {
      console.log(`already running | ${stale.url} | pid:${stale.pid}`);
      return;
    }
    deleteStatus();
  }

  spawn("./scripts/dev.ts", [], { stdio: "ignore", detached: true }).unref();

  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, READY_POLL_MS));
    const s = readStatus();
    if (s?.status === "ready") {
      console.log(`ready | ${s.url} | pid:${s.pid}`);
      return;
    }
  }
  console.error("timeout waiting for dev server to be ready");
  process.exit(1);
}

async function cmdForeground() {
  // Reaper cleans up our pgroup when we die — handles SIGKILL and crashes.
  // Terminal-close cleanup relies on the terminal sending SIGHUP (all modern
  // terminals do); if it doesn't, the foreground keeps running and you can
  // stop it with `./scripts/dev.ts stop`.
  spawnReaper(process.pid);

  process.title = "dev:main";
  console.log(`dev:main pid=${process.pid}`);
  const config = loadConfig();
  const edgeUrl = `http://localhost:${config.edge.devPort}`;

  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      env: { type: "string", short: "e", default: "development" },
      open: { type: "boolean", short: "o", default: false },
    },
    strict: false,
  });

  // Kill any leftover dev server from a crashed previous session.
  const stale = readStatus();
  if (stale && stale.pid !== process.pid && isAlive(stale.pid)) {
    try { process.kill(-stale.pid, "SIGTERM"); } catch { /* already dead */ }
  }
  deleteStatus();

  const all: DevProcess[] = [];
  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    deleteStatus();
    console.log("\x1b[33mShutting down...\x1b[0m");
    // Flag children as expected-dead (suppresses crash logs) and best-effort
    // SIGTERM them. Reaper handles pgroup TERM→KILL once we exit.
    for (const p of all) p.kill();
    process.exit(1);
  };

  const envFlag = [`--env=${values.env}`];
  // onCrash on every DevProcess including types: any subprocess death tears
  // the whole stack down so we never leave a half-running dev server.
  const backend = new DevProcess("Backend", "./scripts/dev.ts", envFlag, { color: "\x1b[34m", cwd: "packages/backend", onCrash: shutdown });
  const frontend = new DevProcess("Frontend", "./scripts/dev.ts", envFlag, { color: "\x1b[32m", cwd: "packages/frontend", onCrash: shutdown });
  const edge = new DevProcess("Edge", "./scripts/dev.ts", [], { color: "\x1b[35m", cwd: "packages/edge", onCrash: shutdown });
  const types = new DevProcess("Types", "./scripts/dev-types.ts", [], { color: "\x1b[33m", cwd: "packages/backend", onCrash: shutdown });
  all.push(backend, frontend, edge, types);

  const status: DevStatus = { status: "starting", url: edgeUrl, pid: process.pid };
  writeStatus(status);

  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP", "SIGTSTP"] as const) {
    process.on(sig, () => shutdown());
  }

  try {
    await Promise.all([
      backend.waitForStdout({ pattern: "Backend running on", timeout: 5000 }),
      frontend.waitForStdout({ pattern: "Local:", timeout: 5000 }),
      edge.waitForStdout({ pattern: "Edge proxy running on", timeout: 5000 }),
    ]);
  } catch (error) {
    console.error(`\x1b[31m${error instanceof Error ? error.message : error}\x1b[0m`);
    shutdown();
  }

  status.status = "ready";
  writeStatus(status);

  console.log(`\n\x1b[32m✓ Dev server ready at ${edgeUrl}\x1b[0m\n`);

  if (values.open) {
    spawn("./scripts/open-chrome.sh", [`http://localhost:${config.edge.devPort}`], { stdio: "inherit" });
  }
}
