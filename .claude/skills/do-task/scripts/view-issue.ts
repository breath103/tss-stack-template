import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { loadConfig, ghGraphql, type Config } from "./lib.ts";

export function viewIssue(args: string[]): void {
  const { values } = parseArgs({
    args,
    options: {
      issue: { type: "string" },
    },
    strict: true,
  });

  if (!values.issue) {
    console.error("Usage: view-issue --issue <issue-number-or-url>");
    process.exit(1);
  }

  const config = loadConfig();

  const json = execFileSync("gh", [
    "issue", "view", values.issue,
    "--repo", config.repo,
    "--json", "number,title,state,body,labels,assignees,url",
  ], { encoding: "utf-8" });

  const issue = JSON.parse(json);

  // Look up the project item ID and status for this issue
  const projectItem = findProjectItem(config, issue.number);

  const result = {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    url: issue.url,
    labels: issue.labels.map((l: { name: string }) => l.name),
    assignees: issue.assignees.map((a: { login: string }) => a.login),
    body: issue.body,
    projectItemId: projectItem?.id ?? null,
    projectStatus: projectItem?.status ?? null,
  };

  console.log(JSON.stringify(result, null, 2));
}

function findProjectItem(config: Config, issueNumber: number): { id: string; status: string | null } | null {
  const [owner, repo] = config.repo.split("/");
  const query = `
    query($owner: String!, $repo: String!, $issueNumber: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $issueNumber) {
          projectItems(first: 10) {
            nodes {
              id
              project { id }
              fieldValueByName(name: "Status") {
                ... on ProjectV2ItemFieldSingleSelectValue { name }
              }
            }
          }
        }
      }
    }
  `;

  const data = ghGraphql(query, { owner, repo, issueNumber });
  const items = data.data.repository.issue?.projectItems?.nodes ?? [];
  const match = items.find((item: any) => item.project.id === config.projectId);
  if (!match) return null;
  return {
    id: match.id,
    status: match.fieldValueByName?.name ?? null,
  };
}
