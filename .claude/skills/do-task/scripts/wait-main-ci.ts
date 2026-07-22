import { execFileSync } from "node:child_process";

// Wait for the post-merge CI run on main to finish — pinned to the merge
// commit SHA. The deploy job lives in this run, so a green result here means
// the change is actually deployed (not just merged).
//
// Why pin by SHA: `gh run list --limit 1` grabs whatever run is newest, which
// races on two fronts — (a) GitHub may not have created THIS push's run yet
// (so you'd watch the previous one), and (b) concurrent merges from other PRs
// create their own main runs. Both make `--limit 1` watch the wrong run and
// report a deploy that was never yours. Matching `headSha` removes both.
export function waitMainCi(mergeSha: string): void {
  const runId = findRunForSha(mergeSha);

  while (true) {
    const viewJson = execFileSync("gh", [
      "run", "view", String(runId),
      "--json", "status,conclusion",
    ], { encoding: "utf-8" });

    const { status, conclusion } = JSON.parse(viewJson);

    if (status === "completed") {
      if (conclusion === "success") {
        console.log(JSON.stringify({ runId, sha: mergeSha, status: "passed" }));
        return;
      }
      console.error(`Main CI failed (run ${runId}, sha ${mergeSha}), conclusion: ${conclusion}`);
      process.exit(1);
    }

    execFileSync("sleep", ["10"]);
  }
}

// Poll until a main run whose headSha === mergeSha exists. The run isn't
// created the instant the merge lands, so retry instead of taking the latest.
function findRunForSha(mergeSha: string): number {
  const MAX_ATTEMPTS = 24; // ~2 min at 5s each
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const runsJson = execFileSync("gh", [
      "run", "list",
      "--branch", "main",
      "--limit", "20",
      "--json", "databaseId,headSha",
    ], { encoding: "utf-8" });

    const run = JSON.parse(runsJson).find(
      (r: { databaseId: number; headSha: string }) => r.headSha === mergeSha,
    );
    if (run) return run.databaseId;

    execFileSync("sleep", ["5"]);
  }

  console.error(`No CI run found on main for merge commit ${mergeSha} after waiting`);
  process.exit(1);
}
