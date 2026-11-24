import { parseArgs } from "node:util";
import { ghGraphql, loadConfig } from "./lib.ts";

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

  const { data } = ghGraphql<{
    node: {
      items: {
        nodes: {
          id: string;
          fieldValueByName: { name?: string } | null;
          content: {
            title?: string;
            number?: number;
            url?: string;
            labels?: { nodes: { name: string }[] };
          } | null;
        }[];
      };
    };
  }>(query, variables);

  const result = data.node.items.nodes.map(item => ({
    id: item.id,
    status: item.fieldValueByName?.name ?? null,
    title: item.content?.title ?? null,
    number: item.content?.number ?? null,
    url: item.content?.url ?? null,
    labels: item.content?.labels?.nodes.map(l => l.name) ?? [],
  }));

  console.log(JSON.stringify(result, null, 2));
}
