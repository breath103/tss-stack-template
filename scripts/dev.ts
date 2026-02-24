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
  const child = spawn("npm", args, { stdio: ["inherit", "pipe", "pipe"] });
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

let exiting = false;
const cleanup = () => {
  if (exiting) return;
  exiting = true;
  // SIGTERM the entire process group (all descendants, not just direct children)
  try { process.kill(0, "SIGTERM"); } catch { /* ignore */ }
  // Force-kill survivors after 2s
  setTimeout(() => {
    try { process.kill(0, "SIGKILL"); } catch { /* ignore */ }
  }, 2000).unref();
};
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

setup();
