import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { config as dotenvConfig } from "dotenv";
import { sanitizeBranchName } from "shared/branch";
import { frontendBucketName, loadConfig } from "shared/config";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import cacheRules from "../cache.json" with { type: "json" };

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      name: { type: "string", short: "n" },
      env: { type: "string", short: "e" },
      help: { type: "boolean", short: "h" },
    },
    strict: true,
  });

  if (values.help) {
    showHelp();
  }

  if (!values.name) {
    console.error("Error: --name is required (e.g., --name=main)");
    console.error("Run with --help for usage information");
    process.exit(1);
  }

  const sanitizedName = sanitizeBranchName(values.name);
  if (!sanitizedName) {
    console.error(`Error: branch name "${values.name}" sanitizes to empty string`);
    process.exit(1);
  }

  if (sanitizedName !== values.name) {
    console.log(`Branch name sanitized: "${values.name}" → "${sanitizedName}"`);
  }

  return { name: sanitizedName, env: values.env };
}

function showHelp(): never {
  console.log(`
Usage: npm run deploy -- [options]

Deploy frontend to S3

Options:
  -n, --name <name>   Deployment name (required)
                      Usually the branch name (e.g., main, staging, feature-x)
  -e, --env <env>     Environment file suffix (optional)
                      Loads .env.<env> instead of .env
                      Example: --env=production loads .env.production
  -h, --help          Show this help message

Examples:
  npm run deploy -- --name=main
  npm run deploy -- --name=main --env=production
  npm run deploy -- -n staging -e staging
`);
  process.exit(0);
}

function loadEnvAndBuild(env: string | undefined): void {
  const envFile = env ? `.env.${env}` : ".env";
  dotenvConfig({ path: path.join(ROOT, envFile) });
  console.log(`Building frontend with ${envFile}...`);
  execSync("npx vite build", { stdio: "inherit", cwd: ROOT, env: process.env });
}

async function uploadDir(
  s3: S3Client,
  bucketName: string,
  deployName: string,
  dir: string,
  prefix: string
): Promise<void> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await uploadDir(s3, bucketName, deployName, fullPath, `${prefix}${entry.name}/`);
    } else {
      const filePath = `${prefix}${entry.name}`;
      const cacheControl = getCacheControl(filePath);
      const key = `${deployName}/${filePath}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: fs.readFileSync(fullPath),
          ContentType: getContentType(entry.name),
          CacheControl: cacheControl,
        })
      );
      console.log(`  ${key} (${cacheControl.split(",")[0]})`);
    }
  }
}

function getCacheControl(filePath: string): string {
  for (const rule of cacheRules) {
    if (globToRegex(rule.pattern).test(filePath)) {
      return rule.cacheControl;
    }
  }
  return "public, max-age=31536000, immutable";
}

function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{GLOBSTAR}}/g, ".*");
  return new RegExp(`^${escaped}$`);
}

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
};

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

async function main() {
  const { name, env } = parseCliArgs();

  loadEnvAndBuild(env);

  const config = loadConfig();
  const bucketName = frontendBucketName(config);
  const s3 = new S3Client({ region: "us-east-1" });

  console.log(`\nUploading to s3://${bucketName}/${name}/...`);
  await uploadDir(s3, bucketName, name, DIST, "");

  console.log(`\n✅ Deployed to s3://${bucketName}/${name}/`);
}
main();
