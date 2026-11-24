import { execFileSync } from "node:child_process";

/**
 * `main` can only be checked out in ONE worktree. Every other checkout of this repo has it
 * taken, so `git switch main` there dies with "fatal: 'main' is already used by worktree at
 * …" — and it dies AFTER the merge and the deploy have already succeeded, which reads as a
 * failed land when nothing failed.
 */
function mainIsInAnotherWorktree(currentBranch: string): boolean {
  if (currentBranch === "main") return false;
  const worktrees = execFileSync("git", ["worktree", "list", "--porcelain"], { encoding: "utf-8" });
  // We are not on main, so a `main` anywhere in this list belongs to a different worktree
  // and no path comparison is needed (which would have to survive /tmp-style symlinks).
  return worktrees.split("\n").some(line => line.trim() === "branch refs/heads/main");
}

export function syncLocal(): void {
  const prBranch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf-8" }).trim();

  execFileSync("git", ["fetch", "origin", "--prune"], { stdio: "inherit" });

  // The PR branch is a parent of the merge commit, so it fast-forwards to origin/main: this
  // checkout ends up with the landed code either way. What differs is the branch it sits on,
  // and the branch cannot be deleted while it is the one checked out here.
  if (mainIsInAnotherWorktree(prBranch)) {
    execFileSync("git", ["merge", "--ff-only", "origin/main"], { stdio: "inherit" });
    console.log(`Kept ${prBranch} (fast-forwarded to origin/main): main is checked out in another worktree`);
    console.log(JSON.stringify({ synced: true, branch: prBranch, deletedBranch: null }));
    return;
  }

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
