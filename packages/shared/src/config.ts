import fs from "fs";
import path from "path";
import { z } from "zod";

// Subdomain mapping value: deployment name, null (blocked), or redirect
const subdomainMapValue = z.union([z.string(), z.null(), z.object({ redirect: z.string() })]);

export type SubdomainMapValue = z.infer<typeof subdomainMapValue>;

const configSchema = z
  .object({
    project: z.string(),
    repo: z.string(),
    dev: z.object({ worktree: z.string(), tunnel: z.boolean().default(false) }),
    edge: z.object({
      devPort: z.number(),
      githubActionsIamRole: z.boolean().default(false),
    }),
    backend: z.object({ region: z.string(), devPort: z.number() }),
    frontend: z.object({ bucketSuffix: z.string(), devPort: z.number() }),
    ssm: z.object({ region: z.string() }),
    domain: z.string().optional(),
    hostedZoneId: z.string().optional(),
    subdomainMap: z.record(z.string(), subdomainMapValue),
  })
  .refine(cfg => !cfg.domain || !!cfg.hostedZoneId, {
    message: "hostedZoneId is required when domain is set",
    path: ["hostedZoneId"],
  });

type ConfigInput = z.infer<typeof configSchema>;

// `edge.devHost` is derived from the project-root directory basename so each
// git worktree (myapp/, myapp-2/, …) serves dev on its own `<dir>.localhost`
// subdomain. Browsers scope cookies per registrable domain, so sibling
// worktrees no longer pile their better-auth cookies under `localhost`
// (which doesn't scope by port → eventual HTTP 431 once cookies pile up).
export type TssConfig = ConfigInput & {
  edge: ConfigInput["edge"] & { devHost: string };
};

export function frontendBucketName({ project, frontend }: Pick<TssConfig, "project" | "frontend">): string {
  const suffix = frontend.bucketSuffix;
  return suffix ? `${project}-frontend-${suffix}` : `${project}-frontend`;
}

function findProjectRoot(): string {
  let dir = process.cwd();
  while (dir !== "/") {
    if (fs.existsSync(path.join(dir, "tss.json"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  console.error("Error: tss.json not found");
  process.exit(1);
}

function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    const baseVal = base[key];
    const overVal = override[key];
    if (
      baseVal &&
      overVal &&
      typeof baseVal === "object" &&
      typeof overVal === "object" &&
      !Array.isArray(baseVal) &&
      !Array.isArray(overVal)
    ) {
      result[key] = deepMerge(baseVal as Record<string, unknown>, overVal as Record<string, unknown>);
    } else {
      result[key] = overVal;
    }
  }
  return result;
}

export function loadConfig(): TssConfig {
  const root = findProjectRoot();
  const configPath = path.join(root, "tss.json");

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch {
    console.error(`Error: failed to parse ${configPath}`);
    process.exit(1);
  }

  const overridePath = path.join(root, "tss.override.json");
  if (fs.existsSync(overridePath)) {
    try {
      const overrides = JSON.parse(fs.readFileSync(overridePath, "utf-8")) as Record<string, unknown>;
      raw = deepMerge(raw as Record<string, unknown>, overrides);
    } catch {
      console.error(`Error: failed to parse ${overridePath}`);
      process.exit(1);
    }
  }

  const result = configSchema.safeParse(raw);
  if (!result.success) {
    console.error("Error: invalid tss.json (after applying overrides)");
    console.error(result.error.format());
    process.exit(1);
  }

  return {
    ...result.data,
    edge: { ...result.data.edge, devHost: `${path.basename(root)}.localhost` },
  };
}
