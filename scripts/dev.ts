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

type Lifecycle = "starting" | "ready";

interface ProcessStatus {
  status: Lifecycle;
  pid: number | null;
}

interface DevStatus {
  status: Lifecycle;
  url: string;
  pid: number;
  processes: Record<string, ProcessStatus>;
}

function isAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

// Detached sh that watches `target` and, once it exits, SIGTERMs its pgroup
// and SIGKILLs after grace. Lives in its own session so the pgroup blast
// doesn't take it down before it can escalate.
function spawnReaper(target: number): void {
  spawn("sh", ["-c", `
    while kill -0 ${target} 2>/dev/null; do sleep 0.5; done
    kill -TERM -${target} 2>/dev/null
    sleep ${GRACE_MS / 1000}
    kill -KILL -${target} 2>/dev/null
  `], { stdio: "ignore", detached: true }).unref();
}

// SIGTERM the foreground's pgroup directly (immediate effect), with a detached
// SIGKILL backstop in case the foreground is hung. Its own reaper handles
// pgroup SIGKILL escalation once the foreground actually dies.
function killForeground(pid: number): void {
  try { process.kill(-pid, "SIGTERM"); } catch { /* already dead */ }
  spawn("sh", ["-c", `sleep ${GRACE_MS / 1000}; kill -9 ${pid} 2>/dev/null`],
    { stdio: "ignore", detached: true }).unref();
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

const subcommand = process.argv[2];
if (subcommand === "status") cmdStatus();
else if (subcommand === "stop") cmdStop();
else if (subcommand === "start") cmdStart();
else void cmdForeground();

function cmdStatus() {
  const s = readStatus();
  if (!s) {
    console.log("not running");
    process.exit(1);
  }
  const procs = Object.entries(s.processes)
    .map(([n, p]) => `${n}:${p.status}`)
    .join(" ");
  console.log(`${s.status} | ${s.url} | ${procs} | pid:${s.pid}`);
}

function cmdStop() {
  const s = readStatus();
  if (!s) {
    console.log("not running");
    return;
  }
  if (isAlive(s.pid)) killForeground(s.pid);
  deleteStatus();
  console.log("stopped");
}

function cmdStart() {
  const stale = readStatus();
  if (stale) {
    if (isAlive(stale.pid)) {
      console.log(`already running | ${stale.url} | pid:${stale.pid}`);
      return;
    }
    deleteStatus();
  }

  spawn("./scripts/dev.ts", [], { stdio: "ignore", detached: true }).unref();

  const start = Date.now();
  const poll = setInterval(() => {
    const s = readStatus();
    if (s?.status === "ready") {
      clearInterval(poll);
      console.log(`ready | ${s.url} | pid:${s.pid}`);
      process.exit(0);
    }
    if (Date.now() - start > READY_TIMEOUT_MS) {
      clearInterval(poll);
      console.error("timeout waiting for dev server to be ready");
      process.exit(1);
    }
  }, READY_POLL_MS);
}

async function cmdForeground() {
  // Parent-death detection: terminal closed without SIGHUP. Just exit;
  // the reaper handles pgroup cleanup.
  const parentPid = process.ppid;
  setInterval(() => {
    if (process.ppid !== parentPid && process.ppid !== 1) process.exit(1);
  }, 500);

  // Reaper cleans up our pgroup when we die (handles SIGKILL and crashes).
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
    killForeground(stale.pid);
  }
  deleteStatus();

  const status: DevStatus = {
    status: "starting",
    url: edgeUrl,
    pid: process.pid,
    processes: {},
  };

  const all: DevProcess[] = [];
  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    deleteStatus();
    console.log("\x1b[33mShutting down...\x1b[0m");
    // Suppress crash-log spam and best-effort SIGTERM each child. The reaper
    // takes care of pgroup SIGTERM + SIGKILL escalation once we exit.
    for (const p of all) p.kill();
    process.exit(1);
  };

  const envFlag = [`--env=${values.env}`];
  // onCrash on every DevProcess (including types): any subprocess death tears
  // the whole stack down so we never leave half a dev server with stale state.
  const backend = new DevProcess("Backend", "./scripts/dev.ts", envFlag, { color: "\x1b[34m", cwd: "packages/backend", onCrash: shutdown });
  const frontend = new DevProcess("Frontend", "./scripts/dev.ts", envFlag, { color: "\x1b[32m", cwd: "packages/frontend", onCrash: shutdown });
  const edge = new DevProcess("Edge", "./scripts/dev.ts", [], { color: "\x1b[35m", cwd: "packages/edge", onCrash: shutdown });
  const types = new DevProcess("Types", "./scripts/dev-types.ts", [], { color: "\x1b[33m", cwd: "packages/backend", onCrash: shutdown });
  all.push(backend, frontend, edge, types);

  for (const p of all) {
    status.processes[p.name.toLowerCase()] = { status: "starting", pid: p.pid ?? null };
  }
  writeStatus(status);

  // SIGHUP for terminal close; SIGTSTP for Ctrl-Z (suspending us would orphan
  // children while we're stopped).
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP", "SIGTSTP"] as const) {
    process.on(sig, () => shutdown());
  }

  try {
    await Promise.all([
      backend.waitForStdout({ pattern: "Backend running on", timeout: 1000 * 5 }),
      frontend.waitForStdout({ pattern: "Local:", timeout: 1000 * 5 }),
      edge.waitForStdout({ pattern: "Edge proxy running on", timeout: 1000 * 5 }),
    ]);
  } catch (error) {
    console.error(`\x1b[31m${error instanceof Error ? error.message : error}\x1b[0m`);
    shutdown();
  }

  for (const p of all) {
    status.processes[p.name.toLowerCase()] = { status: "ready", pid: p.pid ?? null };
  }
  status.status = "ready";
  writeStatus(status);

  console.log(`\n\x1b[32m✓ Dev server ready at ${edgeUrl}\x1b[0m\n`);

  if (values.open) {
    spawn("./scripts/open-chrome.sh", [`http://localhost:${config.edge.devPort}`], { stdio: "inherit" });
  }
}
