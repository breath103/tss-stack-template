import { execSync } from "child_process";
import { build } from "esbuild";
import path from "path";
import fs from "fs";
import * as cdk from "aws-cdk-lib";
import { EdgeStack } from "../lib/stack.js";
import config from "../../../tss.json" with { type: "json" };

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");
const dryRun = process.argv.includes("--dry-run");

const { project, backendRegion, domain, hostedZoneId } = config;

if (!project || !backendRegion || !domain || !hostedZoneId) {
  console.error("Error: tss.json must have project, backendRegion, domain, hostedZoneId");
  process.exit(1);
}

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
    "process.env.PROJECT": JSON.stringify(project),
    "process.env.SSM_REGION": JSON.stringify(backendRegion),
  },
});

console.log(`  project: ${project}`);
console.log(`  backendRegion: ${backendRegion}`);
console.log(`  domain: ${domain}`);
console.log(`  hostedZoneId: ${hostedZoneId}`);

// Synthesize and deploy CDK stack
console.log(`\nDeploying ${project}-edge...`);

const app = new cdk.App({ outdir: path.join(ROOT, "cdk.out") });

const stack = new EdgeStack(app, `${project}-edge`, {
  project,
  ssmRegion: backendRegion,
  domain,
  hostedZoneId,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
});

cdk.Tags.of(stack).add("project", project);

app.synth();

// Deploy using CDK CLI
if (dryRun) {
  console.log("\n--dry-run: Skipping CDK deploy");
  console.log(`Built files in ${DIST}:`);
  execSync(`ls -la ${DIST}`, { stdio: "inherit" });
} else {
  execSync(
    `npx cdk deploy ${project}-edge --app ./cdk.out --require-approval never`,
    { stdio: "inherit", cwd: ROOT }
  );
}
