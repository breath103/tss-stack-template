import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { ghGraphql, ghJson, loadConfig } from "./lib.ts";

export function resolveThreads(args: string[]): void {
  const { values } = parseArgs({
    args,
    options: {
      pr: { type: "string" },
    },
    strict: true,
  });

  const config = loadConfig();

  // If no --pr given, detect from current branch
  let prNumber = values.pr;
  if (!prNumber) {
    prNumber = String(ghJson<{ number: number }>(["pr", "view", "--repo", config.repo, "--json", "number"]).number);
  }

  // Fetch all unresolved review threads
  const query = `{
    repository(owner: "${config.owner}", name: "${config.repo.split("/")[1]}") {
      pullRequest(number: ${prNumber}) {
        reviewThreads(first: 100) {
          nodes {
            id
            isResolved
            comments(first: 1) {
              nodes { body }
            }
          }
        }
      }
    }
  }`;

  const threads = ghGraphql<{
    repository: { pullRequest: { reviewThreads: { nodes: { id: string; isResolved: boolean }[] } } };
  }>(query).data.repository.pullRequest.reviewThreads.nodes;

  const unresolved = threads.filter(t => !t.isResolved);

  if (unresolved.length === 0) {
    console.log(JSON.stringify({ resolved: 0, pr: prNumber }));
    return;
  }

  let resolved = 0;
  for (const thread of unresolved) {
    const mutation = `mutation { resolveReviewThread(input: {threadId: "${thread.id}"}) { thread { isResolved } } }`;
    execFileSync("gh", ["api", "graphql", "-f", `query=${mutation}`], { encoding: "utf-8" });
    resolved++;
  }

  console.log(JSON.stringify({ resolved, total: threads.length, pr: prNumber }));
}
