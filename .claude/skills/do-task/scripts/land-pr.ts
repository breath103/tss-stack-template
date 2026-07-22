import { execFileSync } from "node:child_process";
import { waitMainCi } from "./wait-main-ci.ts";
import { syncLocal } from "./sync-local.ts";

export function landPr(): void {
  // 1. Identify the PR
  const prJson = execFileSync("gh", [
    "pr", "view",
    "--json", "number,title,url,headRefName,statusCheckRollup,closingIssuesReferences",
  ], { encoding: "utf-8" });

  const pr = JSON.parse(prJson);
  const linkedIssues = (pr.closingIssuesReferences ?? []).map((issue: {
    number: number;
    title: string;
    url: string;
  }) => ({ number: issue.number, title: issue.title, url: issue.url }));
  console.error(`Landing PR #${pr.number}: ${pr.title}`);

  // 2. Wait for PR CI
  execFileSync("gh", ["pr", "checks", "--watch", "--fail-fast"], {
    stdio: "inherit",
  });

  // 3. Merge (merge commit, never squash)
  execFileSync("gh", ["pr", "merge", "--merge"], { stdio: "inherit" });

  // 3b. Resolve the actual merge commit SHA so step 4 watches THIS PR's run,
  // not whatever happens to be the latest run on main (concurrent merges race).
  const mergeJson = execFileSync("gh", [
    "pr", "view", String(pr.number), "--json", "mergeCommit",
  ], { encoding: "utf-8" });
  const mergeSha: string | undefined = JSON.parse(mergeJson).mergeCommit?.oid;
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
