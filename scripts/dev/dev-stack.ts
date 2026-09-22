import fs from "node:fs";
import path from "node:path";

import { ProcessTable } from "./process-table.js";
import type { TunnelState } from "./tunnel.js";

type DevStatus =
  | { status: "starting"; url: string; pid: number }
  | { status: "ready"; url: string; pid: number; tunnel: TunnelState }
  // `error` records why the foreground died so a background `start` poller can surface the
  // cause (e.g. backend env-validation failure) instead of hanging until its timeout.
  | { status: "crashed"; url: string; pid: number; error: string };

/**
 * The running dev stack for one worktree.
 *
 * `.dev-status.json` is a cache, not the handle: it can be deleted out from under a live stack,
 * after which `status` claimed "not running", `stop` cleaned up nothing, and `start` spawned a
 * second stack onto the same ports. Every command reconciles against the OS — a live `dev:main`
 * whose cwd is this project root — so the file can only ever be stale, never authoritative.
 */
export class DevStack {
  static readonly MAIN_TITLE = "dev:main";

  private readonly statusFile: string;

  constructor(private readonly root: string) {
    this.statusFile = path.join(root, ".dev-status.json");
  }

  read(): DevStatus | null {
    try {
      // This process wrote the file; a malformed one throws and is caught below.
      return JSON.parse(fs.readFileSync(this.statusFile, "utf-8")) as DevStatus;
    } catch {
      return null;
    }
  }

  write(status: DevStatus): void {
    fs.writeFileSync(this.statusFile, JSON.stringify(status, null, 2) + "\n");
  }

  clear(): void {
    try {
      fs.unlinkSync(this.statusFile);
    } catch {
      /* already gone */
    }
  }

  static isAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /** The live `dev:main` for this worktree, found without the status file. */
  findRunning(): number | null {
    const root = ProcessTable.realpath(this.root);
    if (root === null) return null;
    const candidates = ProcessTable.load().byCommand(DevStack.MAIN_TITLE);
    const cwds = ProcessTable.cwds(candidates.map(row => row.pid));
    for (const candidate of candidates) {
      const cwd = cwds.get(candidate.pid);
      if (cwd !== undefined && ProcessTable.realpath(cwd) === root) return candidate.pid;
    }
    return null;
  }

  /** The stack's pid from the status file when it is still alive, else whatever the OS has. */
  runningPid(): number | null {
    const status = this.read();
    if (status !== null && status.status !== "crashed" && DevStack.isAlive(status.pid)) return status.pid;
    return this.findRunning();
  }

  /** SIGTERMs the stack's process group and clears the status file. Returns the pid it killed. */
  stop(): number | null {
    const pid = this.runningPid();
    if (pid !== null) {
      try {
        process.kill(-pid, "SIGTERM");
      } catch {
        /* already dead */
      }
    }
    this.clear();
    return pid;
  }
}
