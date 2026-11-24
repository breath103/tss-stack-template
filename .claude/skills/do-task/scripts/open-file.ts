import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

// `orca file open` opens a worktree file in the Orca editor of THIS session's worktree.
// It has no --focus flag; opening is what activates the editor tab.
export function openFile(args: string[]): void {
  const { positionals } = parseArgs({ args, allowPositionals: true, strict: true });
  const path = positionals[0];
  if (!path) {
    console.error("Usage: open-file <path>");
    process.exit(1);
  }
  const opened = spawnSync("orca", ["file", "open", path, "--worktree", "active", "--json"], { encoding: "utf-8" });
  if (opened.status !== 0) {
    console.error(`orca file open failed: ${opened.stderr || opened.stdout}`);
    process.exit(opened.status ?? 1);
  }
  console.log(`Opened in Orca: ${path}`);
}
