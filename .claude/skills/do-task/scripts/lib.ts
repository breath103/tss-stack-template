import { execFileSync, spawnSync } from "node:child_process";
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

// A branch behind origin/main was built and tested against stale code, and its conflicts
// surface only at merge. `create-pr`, `land-pr` and `check-main` all stop here instead.
export function requireUpToDateWithMain(): void {
  execFileSync("git", ["fetch", "origin", "main"], { stdio: ["ignore", 2, 2] });
  const behind = Number(execFileSync("git", ["rev-list", "--count", "HEAD..origin/main"], { encoding: "utf-8" }));
  if (behind === 0) return;
  console.error(
    `This branch is ${behind} commit(s) behind origin/main. Run, one call each:\n` +
      "  git rebase origin/main          (resolve any conflict, then `git rebase --continue`)\n" +
      "  npm install\n" +
      "  git push --force-with-lease     (only if the branch is already pushed; its pre-push hook runs ./scripts/ci_local.ts)\n" +
      "then run this command again."
  );
  process.exit(1);
}

// The same `guides` gate as `./scripts/ci_local.ts`: the script prints what to run and exits 1.
export function requireGuidesRechecked(): void {
  const check = spawnSync(join(gitRoot(), "scripts/recheck_guides.ts"), ["--check"], { stdio: ["ignore", 2, 2] });
  if (check.status !== 0) process.exit(1);
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
    return JSON.parse(readFileSync(configPath(), "utf-8")) as Config;
  } catch {
    console.error("github-project.json not found. Run `setup` first.");
    process.exit(1);
  }
}

export function saveConfig(config: Config): void {
  writeFileSync(configPath(), JSON.stringify(config, null, 2) + "\n");
}

// `gh` output is trusted to match the fields the caller asked for (`--json a,b`, a GraphQL
// selection); `T` states that shape, it is not validated.
export function ghJson<T>(args: string[]): T {
  return JSON.parse(execFileSync("gh", args, { encoding: "utf-8" })) as T;
}

export function ghGraphql<T>(query: string, variables: Record<string, string | number> = {}): { data: T } {
  const args = ["api", "graphql", "-f", `query=${query}`];
  for (const [key, value] of Object.entries(variables)) {
    const flag = typeof value === "number" ? "-F" : "-f";
    args.push(flag, `${key}=${value}`);
  }
  return ghJson<{ data: T }>(args);
}

interface ProjectSummary {
  id: string;
  title: string;
  field: { id: string; options?: { id: string; name: string }[] } | null;
}

interface ProjectLookup {
  user?: { projectV2: ProjectSummary | null } | null;
  organization?: { projectV2: ProjectSummary | null } | null;
}

export function fetchProjectConfig(projectUrl: string, repo: string): Config {
  const match = projectUrl.match(/github\.com\/(?:users|orgs)\/([^/]+)\/projects\/(\d+)/);
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

  const asOrg = () => ghGraphql<ProjectLookup>(orgQuery, { owner, number }).data.organization?.projectV2;
  const asUser = () => ghGraphql<ProjectLookup>(userQuery, { owner, number }).data.user?.projectV2;
  const project = isOrg ? (asOrg() ?? asUser()) : (asUser() ?? asOrg());

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

  const labels = ghJson<{ name: string }[]>(["label", "list", "--repo", repo, "--json", "name", "--limit", "100"]).map(
    l => l.name
  );

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
