import fs from "fs";
import path from "path";
import { z } from "zod";

// Subdomain mapping value: deployment name, null (blocked), or redirect
const subdomainMapValue = z.union([
  z.string(),
  z.null(),
  z.object({ redirect: z.string() }),
]);

export type SubdomainMapValue = z.infer<typeof subdomainMapValue>;

const configSchema = z.object({
  project: z.string(),
  repo: z.string(),
  edge: z.object({
    devPort: z.number(),
    githubActionsIamRole: z.boolean().default(false),
  }),
  backend: z.object({ region: z.string(), devPort: z.number() }),
  frontend: z.object({ bucketSuffix: z.string(), devPort: z.number() }),
  ssm: z.object({ region: z.string() }),
  domain: z.string(),
  hostedZoneId: z.string(),
  subdomainMap: z.record(z.string(), subdomainMapValue),
});

export type TssConfig = z.infer<typeof configSchema>;

export function frontendBucketName({
  project,
  frontend,
}: Pick<TssConfig, "project" | "frontend">): string {
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
    if (baseVal && overVal && typeof baseVal === "object" && typeof overVal === "object" && !Array.isArray(baseVal) && !Array.isArray(overVal)) {
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

  return result.data;
}
