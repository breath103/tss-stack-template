#!/usr/bin/env -S node --import tsx
import fs from "node:fs";
import path from "node:path";
import { execSync, spawn } from "node:child_process";
import { parseArgs } from "node:util";

import { loadConfig } from "shared/config";

import { DevProcess } from "./dev/dev-process.js";

const STATUS_FILE = path.join(process.cwd(), ".dev-status.json");
const GRACE_MS = 2000;
const READY_TIMEOUT_MS = 30_000;
const READY_POLL_MS = 300;

type Lifecycle = "starting" | "ready";

// --- Process-tree helpers ---

function isAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

// Walk descendants via `ps`. Catches grandchildren that escaped our pgroup
// (e.g. via setsid) — pgroup-kill alone would miss them.
function walkProcessTree(rootPid: number): number[] {
  try {
    const ps = execSync("ps -eo pid,ppid", { encoding: "utf-8" });
    const lines = ps.trim().split("\n").slice(1);
    const children = new Map<number, number[]>();
    for (const line of lines) {
      const m = line.trim().match(/^(\d+)\s+(\d+)$/);
      if (!m) continue;
      const pid = Number(m[1]);
      const ppid = Number(m[2]);
      if (!children.has(ppid)) children.set(ppid, []);
      children.get(ppid)!.push(pid);
    }
    const walk = (pid: number): number[] => [pid, ...(children.get(pid) ?? []).flatMap(walk)];
    return walk(rootPid);
  } catch {
    return [rootPid];
  }
}

// SIGTERM the pgroup + every descendant, then schedule a detached SIGKILL
// pass after the grace period. Single source of truth for graceful shutdown.
function terminateTree(rootPid: number): void {
  const tree = walkProcessTree(rootPid);
  try { process.kill(-rootPid, "SIGTERM"); } catch { /* already dead */ }
  for (const pid of tree) {
    try { process.kill(pid, "SIGTERM"); } catch { /* already dead */ }
  }
  // Detached sh: SIGKILL stragglers after grace. Lives in its own session so
  // the pgroup SIGTERM above doesn't take it down before it can escalate.
  const targets = [...tree.map(String), `-${rootPid}`].join(" ");
  spawn("sh", ["-c", `sleep ${GRACE_MS / 1000}; kill -9 ${targets} 2>/dev/null`], {
    stdio: "ignore",
    detached: true,
  }).unref();
}

// Parent-death detection + watchdog. Only armed in foreground mode — for
// status/stop/start subcommands these would (a) keep the short-lived command
// alive forever via setInterval, and (b) for `start`, trip the moment the
// launcher exits (ppid→1 on the detached child) and kill the dev server.
function armProcessGuards() {
  const parentPid = process.ppid;
  setInterval(() => {
    // ppid becomes 1 when reparented to init (normal for detached processes);
    // only treat a *different non-1* ppid as a real parent-death signal.
    if (process.ppid !== parentPid && process.ppid !== 1) {
      try { process.kill(0, "SIGTERM"); } catch {}
      process.exit(1);
    }
  }, 500);

  // Detached shell watchdog: polls our PID. If we die (even SIGKILL), it
  // SIGTERMs the pgroup, waits the grace period, then SIGKILLs. Detached so
  // the SIGTERM doesn't kill the watchdog itself (own session/pgroup).
  const self = process.pid;
  spawn("sh", ["-c", `
    while kill -0 ${self} 2>/dev/null; do sleep 0.5; done
    kill -TERM -${self} 2>/dev/null
    sleep ${GRACE_MS / 1000}
    kill -KILL -${self} 2>/dev/null
  `], { stdio: "ignore", detached: true }).unref();
}

// --- Status file ---

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

function readStatus(): DevStatus | null {
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, "utf-8"));
  } catch {
    return null;
  }
}

function writeStatus(s: DevStatus) {
  fs.writeFileSync(STATUS_FILE, JSON.stringify(s, null, 2) + "\n");
}

function deleteStatus() {
  try {
    fs.unlinkSync(STATUS_FILE);
  } catch {
    /* already gone */
  }
}

// --- Subcommands ---

const subcommand = process.argv[2];

if (subcommand === "status") {
  cmdStatus();
} else if (subcommand === "stop") {
  cmdStop();
} else if (subcommand === "start") {
  cmdStart();
} else {
  void cmdForeground();
}

function cmdStatus() {
  const s = readStatus();
  if (!s) {
    console.log("not running");
    process.exit(1);
  }
  const procs = Object.entries(s.processes)
    .map(([name, p]) => `${name}:${p.status}`)
    .join(" ");
  console.log(`${s.status} | ${s.url} | ${procs} | pid:${s.pid}`);
}

function cmdStop() {
  const s = readStatus();
  if (!s) {
    console.log("not running");
    return;
  }
  if (isAlive(s.pid)) terminateTree(s.pid);
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
  armProcessGuards();
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

  const envFlag = [`--env=${values.env}`];

  const status: DevStatus = {
    status: "starting",
    url: edgeUrl,
    pid: process.pid,
    processes: {},
  };

  // Kill a stale dev server from a previously crashed session. Liveness-check
  // first — a recycled PID could mean we'd SIGTERM an unrelated pgroup.
  const stale = readStatus();
  if (stale && stale.pid !== process.pid) {
    if (isAlive(stale.pid)) terminateTree(stale.pid);
    deleteStatus();
  }

  const all: DevProcess[] = [];

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    deleteStatus();
    console.log("\x1b[33mShutting down...\x1b[0m");
    // Flag children as expected-dead so we don't print crash messages on the
    // SIGTERM cascade, then terminate the whole tree (pgroup + escapees + escalation).
    for (const p of all) p.kill();
    terminateTree(process.pid);
    process.exit(1);
  };

  const backend = new DevProcess("Backend", "./scripts/dev.ts", envFlag, { color: "\x1b[34m", cwd: "packages/backend", onCrash: shutdown });
  const frontend = new DevProcess("Frontend", "./scripts/dev.ts", envFlag, { color: "\x1b[32m", cwd: "packages/frontend", onCrash: shutdown });
  const edge = new DevProcess("Edge", "./scripts/dev.ts", [], { color: "\x1b[35m", cwd: "packages/edge", onCrash: shutdown });
  // onCrash on types too: any subprocess death tears the whole dev server
  // down so we never leave half a stack running with stale state.
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
