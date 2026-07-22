import { parseArgs } from "node:util";
import { loadConfig, ghGraphql } from "./lib.ts";

export function listItems(args: string[]): void {
  const { values } = parseArgs({
    args,
    options: {
      column: { type: "string" },
      limit: { type: "string", default: "30" },
    },
    strict: true,
  });

  const config = loadConfig();
  const limit = parseInt(values.limit!, 10);

  const query = `
    query($projectId: ID!, $first: Int!, $q: String) {
      node(id: $projectId) {
        ... on ProjectV2 {
          items(first: $first, query: $q) {
            nodes {
              id
              fieldValueByName(name: "Status") {
                ... on ProjectV2ItemFieldSingleSelectValue { name }
              }
              content {
                ... on Issue {
                  title
                  number
                  url
                  labels(first: 10) { nodes { name } }
                }
                ... on PullRequest {
                  title
                  number
                  url
                }
                ... on DraftIssue {
                  title
                }
              }
            }
          }
        }
      }
    }
  `;

  const variables: Record<string, string | number> = {
    projectId: config.projectId,
    first: limit,
  };
  if (values.column) {
    variables.q = `status:"${values.column}"`;
  }

  const data = ghGraphql(query, variables);
  const items = data.data.node.items.nodes;

  const result = items.map((item: any) => ({
    id: item.id,
    status: item.fieldValueByName?.name ?? null,
    title: item.content?.title ?? null,
    number: item.content?.number ?? null,
    url: item.content?.url ?? null,
    labels: item.content?.labels?.nodes?.map((l: any) => l.name) ?? [],
  }));

  console.log(JSON.stringify(result, null, 2));
}
