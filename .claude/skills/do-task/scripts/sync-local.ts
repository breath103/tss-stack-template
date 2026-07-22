import { execFileSync } from "node:child_process";

export function syncLocal(): void {
  const prBranch = execFileSync("git", [
    "rev-parse", "--abbrev-ref", "HEAD",
  ], { encoding: "utf-8" }).trim();

  execFileSync("git", ["fetch", "origin", "--prune"], { stdio: "inherit" });

  // Leave the worktree on the local main branch, not detached at origin/main.
  execFileSync("git", ["switch", "main"], { stdio: "inherit" });
  execFileSync("git", ["merge", "--ff-only", "origin/main"], { stdio: "inherit" });

  // Delete the merged PR branch locally
  if (prBranch !== "HEAD" && prBranch !== "main") {
    try {
      execFileSync("git", ["branch", "-D", prBranch], { stdio: "inherit" });
      console.log(`Deleted local branch ${prBranch}`);
    } catch {
      // Branch may already be gone
    }
  }

  console.log(JSON.stringify({ synced: true, branch: "main", deletedBranch: prBranch }));
}
