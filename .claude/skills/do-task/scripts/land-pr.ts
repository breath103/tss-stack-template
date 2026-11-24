import { execFileSync } from "node:child_process";
import { ghJson, requireUpToDateWithMain } from "./lib.ts";
import { syncLocal } from "./sync-local.ts";
import { waitMainCi } from "./wait-main-ci.ts";

export function landPr(): void {
  requireUpToDateWithMain();

  // 1. Identify the PR
  const pr = ghJson<{
    number: number;
    title: string;
    closingIssuesReferences: { number: number; title: string; url: string }[] | null;
  }>(["pr", "view", "--json", "number,title,closingIssuesReferences"]);
  const linkedIssues = (pr.closingIssuesReferences ?? []).map(issue => ({
    number: issue.number,
    title: issue.title,
    url: issue.url,
  }));
  console.error(`Landing PR #${pr.number}: ${pr.title}`);

  // 2. Wait for PR CI
  execFileSync("gh", ["pr", "checks", "--watch", "--fail-fast"], {
    stdio: "inherit",
  });

  // 3. Merge (merge commit, never squash)
  execFileSync("gh", ["pr", "merge", "--merge"], { stdio: "inherit" });

  // 3b. Resolve the actual merge commit SHA so step 4 watches THIS PR's run,
  // not whatever happens to be the latest run on main (concurrent merges race).
  const mergeSha = ghJson<{ mergeCommit: { oid: string } | null }>([
    "pr",
    "view",
    String(pr.number),
    "--json",
    "mergeCommit",
  ]).mergeCommit?.oid;
  if (!mergeSha) {
    console.error("Could not resolve merge commit SHA after merge");
    process.exit(1);
  }

  // 4. Wait for main CI — pinned to the merge commit (includes the deploy job)
  waitMainCi(mergeSha);

  // 5. Sync local to origin/main
  syncLocal();

  console.log(JSON.stringify({ landed: true, pr: pr.number, linkedIssues }));
}
