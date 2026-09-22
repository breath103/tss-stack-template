#!/usr/bin/env -S node --import tsx
import { spawn } from "node:child_process";
import { parseArgs } from "node:util";

import { loadConfig, type TssConfig } from "shared/config";

import { DevProcess } from "./dev/dev-process.js";
import { DevStack } from "./dev/dev-stack.js";
import { Tunnel, type TunnelState } from "./dev/tunnel.js";
import { ensureDeps } from "./ensure-deps.js";

const GRACE_MS = 2000;
const READY_TIMEOUT_MS = 30_000;
const READY_POLL_MS = 300;
const EXIT_TIMEOUT_MS = 5000;

// Detached sh: once `target` exits, SIGTERMs its pgroup and SIGKILLs after
// grace. Lives in its own session so the pgroup blast doesn't take it down
// before it escalates.
function spawnReaper(target: number): void {
  spawn(
    "sh",
    [
      "-c",
      `
    while kill -0 ${target} 2>/dev/null; do sleep 0.5; done
    kill -TERM -${target} 2>/dev/null
    sleep ${GRACE_MS / 1000}
    kill -KILL -${target} 2>/dev/null
  `,
    ],
    { stdio: "ignore", detached: true }
  ).unref();
}

function describeTunnel(state: TunnelState): string {
  switch (state.status) {
    case "disabled":
      return "off (set dev.tunnel in tss.json to enable)";
    case "absent":
      return "none (cloudflared not installed)";
    case "down":
      return "DOWN — nothing on the internet can reach this dev server";
    case "ready":
      return state.url;
  }
}

function cmdStatus(stack: DevStack): void {
  const status = stack.read();
  if (status === null) {
    const untracked = stack.findRunning();
    if (untracked === null) {
      console.log("not running");
      process.exit(1);
    }
    console.log(`running | untracked (no .dev-status.json) | pid:${untracked}`);
    return;
  }
  const line = `${status.status} | ${status.url} | pid:${status.pid}`;
  switch (status.status) {
    case "starting":
      console.log(line);
      return;
    case "ready":
      console.log(`${line} | tunnel:${describeTunnel(status.tunnel)}`);
      return;
    case "crashed":
      console.log(line);
      console.error(status.error);
      return;
  }
}

function cmdStop(stack: DevStack): void {
  console.log(stack.stop() === null ? "not running" : "stopped");
}

async function waitForPidExit(pid: number): Promise<void> {
  const deadline = Date.now() + EXIT_TIMEOUT_MS;
  while (Date.now() < deadline && DevStack.isAlive(pid)) {
    await new Promise(resolve => setTimeout(resolve, READY_POLL_MS));
  }
}

async function cmdStart(stack: DevStack): Promise<void> {
  const status = stack.read();
  if (status !== null && status.status !== "crashed" && DevStack.isAlive(status.pid)) {
    console.log(`already running | ${status.url} | pid:${status.pid}`);
    return;
  }
  // The status file can be gone or stale while the stack is alive; spawning past it
  // double-binds this worktree's ports, so reconcile against the OS before spawning.
  const untracked = stack.findRunning();
  if (untracked !== null) {
    console.log(`reaping untracked dev server (pid ${untracked})`);
    stack.stop();
    await waitForPidExit(untracked);
  }
  stack.clear();

  spawn("./scripts/dev.ts", [], { stdio: "ignore", detached: true }).unref();

  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, READY_POLL_MS));
    const current = stack.read();
    if (current === null) continue;
    switch (current.status) {
      case "ready":
        console.log(`ready | ${current.url} | pid:${current.pid} | tunnel:${describeTunnel(current.tunnel)}`);
        return;
      case "crashed":
        console.error("dev server failed to start:");
        console.error(current.error);
        process.exit(1);
        break;
      case "starting":
        // Foreground wrote "starting" but the process is gone — it died before
        // it could record a reason (e.g. SIGKILL). Don't keep polling.
        if (!DevStack.isAlive(current.pid)) {
          console.error(`dev server foreground (pid ${current.pid}) died before becoming ready`);
          process.exit(1);
        }
        break;
    }
  }
  console.error("timeout waiting for dev server to be ready");
  process.exit(1);
}

async function cmdForeground(stack: DevStack, config: TssConfig): Promise<void> {
  // Reaper cleans up our pgroup when we die — handles SIGKILL and crashes.
  // Terminal-close cleanup relies on the terminal sending SIGHUP (all modern
  // terminals do); if it doesn't, the foreground keeps running and you can
  // stop it with `./scripts/dev.ts stop`.
  spawnReaper(process.pid);

  process.title = DevStack.MAIN_TITLE;
  console.log(`${DevStack.MAIN_TITLE} pid=${process.pid}`);
  const edgeUrl = `http://${config.edge.devHost}:${config.edge.devPort}`;

  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      env: { type: "string", short: "e", default: "development" },
      open: { type: "boolean", short: "o", default: false },
    },
    strict: false,
  });

  // Kill any leftover dev server from a crashed previous session.
  const previous = stack.runningPid();
  if (previous !== null && previous !== process.pid) {
    try {
      process.kill(-previous, "SIGTERM");
    } catch {
      /* already dead */
    }
    await waitForPidExit(previous);
  }
  stack.clear();
  stack.write({ status: "starting", url: edgeUrl, pid: process.pid });

  let shuttingDown = false;
  let ready = false;
  // Read through a call: `shutdown` can run while `respawnTunnelChildren` awaits, which
  // narrowing on the variable itself cannot see.
  const isShuttingDown = () => shuttingDown;
  // `reason` distinguishes signal-driven stops (undefined → clean exit, status
  // file removed) from crashes (string → status flipped to "crashed" with the
  // recorded cause so a background `start` poller can surface it).
  const shutdown = (reason?: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (reason === undefined) {
      stack.clear();
    } else {
      stack.write({ status: "crashed", url: edgeUrl, pid: process.pid, error: reason });
    }
    console.log("\x1b[33mShutting down...\x1b[0m");
    // Flag children as expected-dead (suppresses crash logs) and best-effort
    // SIGTERM them. Reaper handles pgroup TERM→KILL once we exit.
    tunnel?.kill();
    for (const p of [backend, frontend, edge, types]) p.kill();
    process.exit(1);
  };

  const envFlag = [`--env=${values.env}`];
  const tunnelEnv = (state: TunnelState) => (state.status === "ready" ? { DEV_TUNNEL_URL: state.url } : undefined);

  // Opt-in via `dev.tunnel`: a cloudflared quick tunnel (random hostname, no account) giving
  // the local edge a public URL, for anything off this machine that has to call back in — a
  // webhook sender, a remote sandbox, a phone on another network. The Host header is rewritten
  // to the worktree's devHost because the edge 308s any other host. The URL reaches the backend
  // as DEV_TUNNEL_URL. `edge.devPort + 3` is the next slot in this worktree's port block
  // (edge, backend, frontend).
  const tunnel = config.dev.tunnel
    ? new Tunnel({
        devPort: config.edge.devPort,
        devHost: config.edge.devHost,
        metricsPort: config.edge.devPort + 3,
        onChange: state => {
          // Before readiness the children were just spawned with this very state, and respawning
          // mid-startup would abort the `waitForStdout` handshake below.
          if (!ready) return;
          stack.write({ status: "ready", url: edgeUrl, pid: process.pid, tunnel: state });
          if (state.status === "ready") void respawnTunnelChildren(state);
        },
      })
    : null;
  const tunnelState: TunnelState = tunnel === null ? { status: "disabled" } : await tunnel.start();

  // onCrash on every DevProcess including types: any subprocess death tears
  // the whole stack down so we never leave a half-running dev server.
  const spawnBackend = (state: TunnelState) =>
    new DevProcess("Backend", "./scripts/dev.ts", envFlag, {
      color: "\x1b[34m",
      cwd: "packages/backend",
      env: tunnelEnv(state),
      onCrash: shutdown,
    });

  let backend = spawnBackend(tunnelState);

  // A child's env is fixed at spawn, so a re-minted hostname reaches the backend only by
  // respawning it. Nothing else carries DEV_TUNNEL_URL. `kill()` marks it expected-dead, so
  // `onCrash` does not fire `shutdown` and tear the whole stack down.
  async function respawnTunnelChildren(state: TunnelState): Promise<void> {
    if (isShuttingDown()) return;
    console.log("\x1b[36m[Tunnel] new hostname — restarting Backend\x1b[0m");
    backend.kill();
    // The replacement binds the same port, and SIGTERM returns long before the old one
    // releases it: spawning straight away dies with "port already in use", whose onCrash
    // tears the whole stack down.
    await backend.waitForExit(EXIT_TIMEOUT_MS);
    if (isShuttingDown()) return;
    backend = spawnBackend(state);
  }

  const frontend = new DevProcess("Frontend", "./scripts/dev.ts", envFlag, {
    color: "\x1b[32m",
    cwd: "packages/frontend",
    onCrash: shutdown,
  });
  const edge = new DevProcess("Edge", "./scripts/dev.ts", [], {
    color: "\x1b[35m",
    cwd: "packages/edge",
    onCrash: shutdown,
  });
  const types = new DevProcess("Types", "./scripts/dev-types.ts", [], {
    color: "\x1b[33m",
    cwd: "packages/backend",
    onCrash: shutdown,
  });

  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP", "SIGTSTP"] as const) {
    process.on(sig, () => shutdown());
  }

  try {
    await Promise.all([
      backend.waitForStdout({ pattern: "Backend running on", timeout: 5000 }),
      // Match "http://localhost:" not "Local:" — vite bolds "Local" so its
      // output is literally `Local\x1b[22m:`, and the ANSI reset between the
      // word and the colon makes a plain "Local:" substring never match.
      frontend.waitForStdout({ pattern: "localhost:", timeout: 5000 }),
      edge.waitForStdout({ pattern: "Edge proxy running on", timeout: 5000 }),
    ]);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`\x1b[31m${msg}\x1b[0m`);
    shutdown(msg);
  }

  ready = true;
  stack.write({ status: "ready", url: edgeUrl, pid: process.pid, tunnel: tunnel?.current() ?? { status: "disabled" } });

  console.log(`\n\x1b[32m✓ Dev server ready at ${edgeUrl}\x1b[0m`);
  if (tunnel !== null) console.log(`\x1b[2m  tunnel: ${describeTunnel(tunnel.current())}\x1b[0m`);
  console.log();

  if (values.open) {
    spawn("./scripts/open-chrome.sh", [edgeUrl], { stdio: "inherit" });
  }
}

async function main(): Promise<void> {
  ensureDeps();
  const config = loadConfig();
  const stack = new DevStack(process.cwd());
  switch (process.argv[2]) {
    case "status":
      return cmdStatus(stack);
    case "stop":
      return cmdStop(stack);
    case "start":
      return await cmdStart(stack);
    default:
      return await cmdForeground(stack, config);
  }
}

main().catch((error: unknown) => {
  console.error(`\x1b[31m${error instanceof Error ? error.message : String(error)}\x1b[0m`);
  process.exit(1);
});
