import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { loadConfig } from "./lib.ts";

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
    const prJson = execFileSync("gh", [
      "pr", "view",
      "--repo", config.repo,
      "--json", "number",
    ], { encoding: "utf-8" }).trim();
    prNumber = String(JSON.parse(prJson).number);
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

  const result = execFileSync("gh", [
    "api", "graphql",
    "-f", `query=${query}`,
  ], { encoding: "utf-8" }).trim();

  const threads = JSON.parse(result).data.repository.pullRequest.reviewThreads.nodes as {
    id: string;
    isResolved: boolean;
    comments: { nodes: { body: string }[] };
  }[];

  const unresolved = threads.filter((t) => !t.isResolved);

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
