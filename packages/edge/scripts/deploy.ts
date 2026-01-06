import { execSync } from "child_process";
import { build } from "esbuild";
import path from "path";
import fs from "fs";
import * as cdk from "aws-cdk-lib";
import { EdgeStack } from "../lib/stack.js";
import { loadConfig } from "@app/shared/config";

const config = loadConfig();

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");
const dryRun = process.argv.includes("--dry-run");

console.log("Building edge functions...");
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// Build viewer-request CloudFront Function
// CloudFront Functions require a global `handler` function (no exports).
// treeShaking must be disabled because esbuild removes unexported functions as dead code.
// Target ES2019 to compile away ?. and ?? (not supported in CloudFront Functions runtime).
await build({
  entryPoints: [path.join(ROOT, "lib/viewer-request.ts")],
  bundle: true,
  platform: "neutral",
  target: "es2019",
  format: "esm",
  treeShaking: false,
  outfile: path.join(DIST, "viewer-request/index.js"),
  define: {
    SUBDOMAIN_MAP_CONFIG: JSON.stringify(config.subdomainMap),
  },
});

// Build origin-request Lambda@Edge (runs on Node.js 24.x runtime)
// CJS format for simpler Lambda compatibility (auto-detects exports.handler)
await build({
  entryPoints: [path.join(ROOT, "lib/origin-request.ts")],
  bundle: true,
  platform: "node",
  target: "node24",
  format: "cjs",
  outfile: path.join(DIST, "origin-request/index.js"),
  define: {
    "process.env.PROJECT": JSON.stringify(config.project),
    "process.env.SSM_REGION": JSON.stringify(config.ssm.region),
  },
});

console.log(`  project: ${config.project}`);
console.log(`  backend.region: ${config.backend.region}`);
console.log(`  ssm.region: ${config.ssm.region}`);
console.log(`  domain: ${config.domain}`);
console.log(`  hostedZoneId: ${config.hostedZoneId}`);

// Synthesize and deploy CDK stack
console.log(`\nDeploying ${config.project}-edge...`);

const app = new cdk.App({ outdir: path.join(ROOT, "cdk.out") });

const stack = new EdgeStack(app, `${config.project}-edge`, {
  project: config.project,
  ssmRegion: config.ssm.region,
  domain: config.domain,
  hostedZoneId: config.hostedZoneId,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
});

cdk.Tags.of(stack).add("project", config.project);

app.synth();

// Deploy using CDK CLI
if (dryRun) {
  console.log("\n--dry-run: Skipping CDK deploy");
  console.log(`Built files in ${DIST}:`);
  execSync(`ls -la ${DIST}`, { stdio: "inherit" });
} else {
  execSync(
    `npx cdk deploy ${config.project}-edge --app ./cdk.out --require-approval never`,
    { stdio: "inherit", cwd: ROOT }
  );
}
