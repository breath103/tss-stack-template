import fs from "fs";
import path from "path";
import { z } from "zod";

const configSchema = z.object({
  project: z.string(),
  repo: z.string(),
  backend: z.object({ region: z.string() }),
  frontend: z.object({ bucketSuffix: z.string() }),
  ssm: z.object({ region: z.string() }),
  domain: z.string(),
  hostedZoneId: z.string(),
  subdomainMap: z.record(z.string(), z.string().nullable()),
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

  const result = configSchema.safeParse(raw);
  if (!result.success) {
    console.error("Error: invalid tss.json");
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}
