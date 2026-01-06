import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { loadConfig } from "@app/shared/config";
import cacheRules from "../cache.json" with { type: "json" };
import { sanitizeBranchName } from "@app/shared/branch";
import * as SSMParameters from "@app/shared/ssm-parameters";

const config = loadConfig();

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

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");

// Parse CLI args
const args = process.argv.slice(2);
let name: string | undefined;

for (const arg of args) {
  if (arg.startsWith("--name=")) {
    name = arg.split("=")[1];
  }
}

if (!name) {
  console.error("Error: --name is required (e.g., --name=main)");
  process.exit(1);
}

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

// Get bucket name from SSM (edge stack is always in us-east-1)
const ssm = new SSMClient({ region: "us-east-1" });
const bucketParam = await ssm.send(
  new GetParameterCommand({ Name: SSMParameters.frontendBucketName({ project: config.project }) })
);
const bucketName = bucketParam.Parameter?.Value;

if (!bucketName) {
  console.error("Error: Frontend bucket not found in SSM. Deploy edge first.");
  process.exit(1);
}

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
