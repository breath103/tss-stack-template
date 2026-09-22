import { execSync } from "node:child_process";
import fs from "node:fs";

export interface ProcessRow {
  pid: number;
  ppid: number;
  command: string;
}

/** A snapshot of `ps -eo pid,ppid,command`, plus `lsof` cwd resolution. */
export class ProcessTable {
  private constructor(readonly rows: ProcessRow[]) {}

  static load(): ProcessTable {
    const ps = execSync("ps -eo pid,ppid,command", { encoding: "utf-8" });
    const rows = ps
      .trim()
      .split("\n")
      .slice(1)
      .flatMap(line => {
        const match = /^(\d+)\s+(\d+)\s+(.+)$/.exec(line.trim());
        return match ? [{ pid: Number(match[1]), ppid: Number(match[2]), command: match[3].trim() }] : [];
      });
    return new ProcessTable(rows);
  }

  childrenOf(pid: number): ProcessRow[] {
    return this.rows.filter(row => row.ppid === pid);
  }

  byCommand(command: string): ProcessRow[] {
    return this.rows.filter(row => row.command === command);
  }

  /** Working directory per pid. Pids whose cwd `lsof` cannot read are omitted. */
  static cwds(pids: number[]): Map<number, string> {
    const cwds = new Map<number, string>();
    if (pids.length === 0) return cwds;
    let output: string;
    try {
      output = execSync(`lsof -a -d cwd -p ${pids.join(",")}`, {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {
      // lsof exits non-zero when it cannot stat every pid, having still printed the rest.
      return cwds;
    }
    for (const line of output.split("\n")) {
      const cols = line.trim().split(/\s+/);
      if (cols.length < 9) continue;
      cwds.set(Number(cols[1]), cols.slice(8).join(" "));
    }
    return cwds;
  }

  /** Symlinked worktrees report a different cwd string than the invoking shell's path. */
  static realpath(dir: string): string | null {
    try {
      return fs.realpathSync(dir);
    } catch {
      return null;
    }
  }
}
