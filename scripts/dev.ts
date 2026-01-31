import { spawn } from "node:child_process";
import { parseArgs } from "node:util";

import { fromEvent, merge, take } from "rxjs";

import config from "../tss.json";

const { values } = parseArgs({
  options: { 
    env: { type: "string", short: "e" },
    open: { type: "boolean", short: "o", default: false },   
  },
  strict: false,
});

const envFlag = values.env ? ["--", `--env=${values.env}`] : [];

const procs = [
  { name: "edge", color: "\x1b[35m", args: ["run", "dev", "-w", "edge"] },
  { name: "backend", color: "\x1b[34m", args: ["run", "dev", "-w", "backend", ...envFlag] },
  { name: "types", color: "\x1b[33m", args: ["run", "dev:types", "-w", "backend"] },
  { name: "frontend", color: "\x1b[32m", args: ["run", "dev", "-w", "frontend", ...envFlag] },
];

const children = procs.map(({ name, color, args }) => {
  const child = spawn("npm", args, { stdio: ["inherit", "pipe", "pipe"], detached: true });
  const prefix = (line: string) => line && `${color}[${name}]\x1b[0m ${line}\n`;
  child.stdout?.on("data", (d: Buffer) => d.toString().split("\n").map(prefix).forEach((l) => process.stdout.write(l)));
  child.stderr?.on("data", (d: Buffer) => d.toString().split("\n").map(prefix).forEach((l) => process.stderr.write(l)));
  return child;
});

const killAll = () => {
  children.forEach((c) => process.kill(-c.pid!, "SIGKILL")); // Kill process group
  process.exit(0);
};

merge(
  ...children.map((c) => fromEvent(c, "exit")),
  fromEvent(process, "SIGINT"),
  fromEvent(process, "SIGTERM"),
).pipe(take(1)).subscribe(killAll);

if (values.open) {
  spawn("./scripts/open-chrome.sh", [`http://localhost:${config.edge.devPort}`], { stdio: "inherit" });
}