import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { parseArgs } from "util";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config as dotenvConfig } from "dotenv";
import { loadConfig, frontendBucketName } from "@app/shared/config";
import cacheRules from "../cache.json" with { type: "json" };
import { sanitizeBranchName } from "@app/shared/branch";

const config = loadConfig();
const ROOT = path.resolve(import.meta.dirname, "..");
const bucketName = frontendBucketName(config);

// Convert glob pattern to regex (supports * and **)
function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/{{GLOBSTAR}}/g, ".*");
  return new RegExp(`^${escaped}$`);
}

// Find first matching cache control rule
function getCacheControl(filePath: string): string {
  for (const rule of cacheRules) {
    if (globToRegex(rule.pattern).test(filePath)) {
      return rule.cacheControl;
    }
  }
  return "public, max-age=31536000, immutable"; // default
}

const DIST = path.join(ROOT, "dist");

// Parse CLI args
const { values } = parseArgs({
  options: {
    name: { type: "string", short: "n" },
    env: { type: "string", short: "e" },
    help: { type: "boolean", short: "h" },
  },
  strict: true,
});

const { name, env, help } = values;

if (help) {
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

if (!name) {
  console.error("Error: --name is required (e.g., --name=main)");
  console.error("Run with --help for usage information");
  process.exit(1);
}

// Load environment file
const envFile = env ? `.env.${env}` : ".env";
dotenvConfig({ path: path.join(ROOT, envFile) });
console.log(`Loaded environment from ${envFile}`);

const sanitizedName = sanitizeBranchName(name);
if (!sanitizedName) {
  console.error(`Error: branch name "${name}" sanitizes to empty string`);
  process.exit(1);
}

if (sanitizedName !== name) {
  console.log(`Branch name sanitized: "${name}" → "${sanitizedName}"`);
}

// Build frontend
console.log("Building frontend...");
execSync("npm run build", { stdio: "inherit", cwd: ROOT });

console.log(`\nUploading to s3://${bucketName}/${sanitizedName}/...`);

// Upload dist/ to S3 (bucket is in us-east-1 with edge stack)
const s3 = new S3Client({ region: "us-east-1" });

const mimeTypes: Record<string, string> = {
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

async function uploadDir(dir: string, prefix: string) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await uploadDir(fullPath, `${prefix}${entry.name}/`);
    } else {
      const filePath = `${prefix}${entry.name}`;
      const ext = path.extname(entry.name).toLowerCase();
      const contentType = mimeTypes[ext] || "application/octet-stream";
      const cacheControl = getCacheControl(filePath);
      const key = `${sanitizedName}/${filePath}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: fs.readFileSync(fullPath),
          ContentType: contentType,
          CacheControl: cacheControl,
        })
      );
      console.log(`  ${key} (${cacheControl.split(",")[0]})`);
    }
  }
}

await uploadDir(DIST, "");

console.log(`\n✅ Deployed to s3://${bucketName}/${sanitizedName}/`);
