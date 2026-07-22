import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface Config {
  project: string;
  repo: string;
  owner: string;
  number: number;
  projectId: string;
  title: string;
  statusFieldId: string;
  columns: Record<string, string>;
  labels: string[];
}

export function gitRoot(): string {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf-8",
  }).trim();
}

export function configPath(): string {
  return join(gitRoot(), "github-project.json");
}

export function loadConfig(): Config {
  try {
    return JSON.parse(readFileSync(configPath(), "utf-8"));
  } catch {
    console.error("github-project.json not found. Run `setup` first.");
    process.exit(1);
  }
}

export function saveConfig(config: Config): void {
  writeFileSync(configPath(), JSON.stringify(config, null, 2) + "\n");
}

export function ghGraphql(query: string, variables: Record<string, string | number> = {}): any {
  const args = [
    "api",
    "graphql",
    "-f",
    `query=${query}`,
  ];
  for (const [key, value] of Object.entries(variables)) {
    const flag = typeof value === "number" ? "-F" : "-f";
    args.push(flag, `${key}=${value}`);
  }
  const result = execFileSync("gh", args, { encoding: "utf-8" });
  return JSON.parse(result);
}

export function fetchProjectConfig(projectUrl: string, repo: string): Config {
  const match = projectUrl.match(
    /github\.com\/(?:users|orgs)\/([^/]+)\/projects\/(\d+)/
  );
  if (!match) {
    console.error(`Invalid project URL: ${projectUrl}`);
    console.error("Expected: https://github.com/users/<owner>/projects/<number>");
    process.exit(1);
  }

  const owner = match[1];
  const number = parseInt(match[2], 10);

  const query = `
    query($owner: String!, $number: Int!) {
      user(login: $owner) {
        projectV2(number: $number) {
          id
          title
          field(name: "Status") {
            ... on ProjectV2SingleSelectField {
              id
              options { id name }
            }
          }
        }
      }
    }
  `;

  // Try as org first if the URL contains /orgs/, otherwise try user first
  const isOrg = projectUrl.includes("/orgs/");
  const userQuery = query;
  const orgQuery = query.replace("user(login:", "organization(login:");

  let project: any;
  if (isOrg) {
    project = ghGraphql(orgQuery, { owner, number }).data.organization?.projectV2;
    if (!project) {
      project = ghGraphql(userQuery, { owner, number }).data.user?.projectV2;
    }
  } else {
    project = ghGraphql(userQuery, { owner, number }).data.user?.projectV2;
    if (!project) {
      project = ghGraphql(orgQuery, { owner, number }).data.organization?.projectV2;
    }
  }

  if (!project) {
    console.error("Project not found. Check the URL and your gh auth scopes.");
    console.error("Run: gh auth refresh -s read:project,project -h github.com");
    process.exit(1);
  }

  const statusField = project.field;
  if (!statusField?.options) {
    console.error("No Status field found on the project.");
    process.exit(1);
  }

  const columns: Record<string, string> = {};
  for (const opt of statusField.options) {
    columns[opt.name] = opt.id;
  }

  const labelsJson = execFileSync("gh", [
    "label", "list",
    "--repo", repo,
    "--json", "name",
    "--limit", "100",
  ], { encoding: "utf-8" });
  const labels = JSON.parse(labelsJson).map((l: { name: string }) => l.name);

  return {
    project: projectUrl,
    repo,
    owner,
    number,
    projectId: project.id,
    title: project.title,
    statusFieldId: statusField.id,
    columns,
    labels,
  };
}

export function resolveColumnId(config: Config, columnName: string): string {
  const id = config.columns[columnName];
  if (!id) {
    const valid = Object.keys(config.columns).join(", ");
    console.error(`Unknown column "${columnName}". Valid: ${valid}`);
    process.exit(1);
  }
  return id;
}
