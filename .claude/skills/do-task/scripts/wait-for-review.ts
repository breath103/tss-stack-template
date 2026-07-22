import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";

export function waitForReview(args: string[]): void {
  const { values } = parseArgs({
    args,
    options: {
      pr: { type: "string" },
      since: { type: "string" },
      interval: { type: "string", default: "30" },
    },
    strict: true,
  });

  let prNumber = values.pr ?? "";
  let since = values.since ?? "";
  const interval = parseInt(values.interval!, 10) * 1000;

  if (!prNumber) {
    try {
      prNumber = execFileSync("gh", ["pr", "view", "--json", "number", "-q", ".number"], { encoding: "utf-8" }).trim();
    } catch {
      console.error("No PR found for current branch");
      process.exit(1);
    }
  }

  const repo = execFileSync("gh", ["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"], { encoding: "utf-8" }).trim();

  if (!since) {
    since = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  }

  process.stderr.write(`Waiting for comments on PR #${prNumber} (since ${since}, polling every ${values.interval}s)...\n`);

  const poll = () => {
    // Self-terminate if the PR is no longer open — otherwise this process leaks
    // past the session that started it (orphaned tsx/node polling forever).
    const prState = execFileSync(
      "gh", ["pr", "view", prNumber, "--json", "state", "-q", ".state"],
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    if (prState !== "OPEN") {
      process.stderr.write(`PR #${prNumber} is ${prState}; exiting.\n`);
      process.exit(0);
    }

    const issueComments = JSON.parse(
      execFileSync("gh", ["api", `repos/${repo}/issues/${prNumber}/comments`,
        "--jq", `[.[] | select(.created_at > "${since}") | {author: .user.login, body, created_at, type: "comment"}]`
      ], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim() || "[]"
    );

    const reviewComments = JSON.parse(
      execFileSync("gh", ["api", `repos/${repo}/pulls/${prNumber}/comments`,
        "--jq", `[.[] | select(.created_at > "${since}") | {author: .user.login, body, created_at, path, type: "review_comment"}]`
      ], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim() || "[]"
    );

    const reviews = JSON.parse(
      execFileSync("gh", ["api", `repos/${repo}/pulls/${prNumber}/reviews`,
        "--jq", `[.[] | select(.submitted_at > "${since}" and .body != "") | {author: .user.login, body, created_at: .submitted_at, state, type: "review"}]`
      ], { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim() || "[]"
    );

    const all = [...issueComments, ...reviewComments, ...reviews].sort(
      (a: any, b: any) => a.created_at.localeCompare(b.created_at)
    );

    if (all.length > 0) {
      process.stderr.write(`Found ${all.length} new comment(s):\n`);
      console.log(JSON.stringify(all, null, 2));
      process.exit(0);
    }
  };

  poll();
  setInterval(poll, interval);
}
