import { type ChildProcess, spawn } from "node:child_process";
import { parseArgs } from "node:util";

import { loadConfig } from "shared/config";

const config = loadConfig();

const { values } = parseArgs({
  options: {
    env: { type: "string", short: "e" },
    open: { type: "boolean", short: "o", default: false },
  },
  strict: false,
});

const envFlag = values.env ? ["--", `--env=${values.env}`] : [];
const children: ChildProcess[] = [];

function spawnProc({ name, color, args }: { name: string; color: string; args: string[] }) {
  const child = spawn("npm", args, { stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  const prefix = (line: string) => line && `${color}[${name}]\x1b[0m ${line}\n`;
  child.stdout?.on("data", (d: Buffer) => d.toString().split("\n").map(prefix).forEach((l) => process.stdout.write(l)));
  child.stderr?.on("data", (d: Buffer) => d.toString().split("\n").map(prefix).forEach((l) => process.stderr.write(l)));
  return child;
}

const devProcs = [
  { name: "edge", color: "\x1b[35m", args: ["run", "dev", "-w", "edge"] },
  { name: "backend", color: "\x1b[34m", args: ["run", "dev", "-w", "backend", ...envFlag] },
  { name: "types", color: "\x1b[33m", args: ["run", "dev:types", "-w", "backend"] },
  { name: "frontend", color: "\x1b[32m", args: ["run", "dev", "-w", "frontend", ...envFlag] },
];

function setup() {
  devProcs.forEach(spawnProc);

  if (values.open) {
    spawn("./scripts/open-chrome.sh", [`http://localhost:${config.edge.devPort}`], { stdio: "inherit" });
  }
}

// Ctrl-C (SIGINT) and SIGTERM: kill all children via process group signal, then exit.
// Ctrl-Z (SIGTSTP): override default suspend behavior — treat same as Ctrl-C.
// process.kill(0, signal) sends to all processes in our process group (all children
// share it since they're not detached). This does NOT reach the parent shell (zsh)
// because zsh runs foreground jobs in a separate process group.
let exiting = false;
const cleanup = () => {
  if (exiting) return;
  exiting = true;
  try { process.kill(0, "SIGTERM"); } catch { /* ignore */ }
  setTimeout(() => {
    try { process.kill(0, "SIGKILL"); } catch { /* ignore */ }
  }, 2000).unref();
};
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
process.on("SIGTSTP", cleanup);

setup();
