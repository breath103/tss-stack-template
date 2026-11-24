import { parseArgs } from "node:util";
import { type Config, ghGraphql, ghJson, loadConfig } from "./lib.ts";

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

  const issue = ghJson<{
    number: number;
    title: string;
    state: string;
    body: string;
    url: string;
    labels: { name: string }[];
    assignees: { login: string }[];
  }>(["issue", "view", values.issue, "--repo", config.repo, "--json", "number,title,state,body,labels,assignees,url"]);

  // Look up the project item ID and status for this issue
  const projectItem = findProjectItem(config, issue.number);

  const result = {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    url: issue.url,
    labels: issue.labels.map(l => l.name),
    assignees: issue.assignees.map(a => a.login),
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

  const { data } = ghGraphql<{
    repository: {
      issue: {
        projectItems: {
          nodes: { id: string; project: { id: string }; fieldValueByName: { name?: string } | null }[];
        };
      } | null;
    };
  }>(query, { owner, repo, issueNumber });
  const items = data.repository.issue?.projectItems.nodes ?? [];
  const match = items.find(item => item.project.id === config.projectId);
  if (!match) return null;
  return {
    id: match.id,
    status: match.fieldValueByName?.name ?? null,
  };
}
