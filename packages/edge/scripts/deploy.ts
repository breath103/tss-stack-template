import { execSync } from "child_process";
import { build } from "esbuild";
import path from "path";
import fs from "fs";
import * as cdk from "aws-cdk-lib";
import { EdgeStack } from "../lib/stack.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const REPO_ROOT = path.resolve(ROOT, "../..");
const DIST = path.join(ROOT, "dist");

// Load config
const config = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, "tss.config.json"), "utf-8")
);

const { project, backendRegion, domain, hostedZoneId } = config;

if (!project || !backendRegion || !domain || !hostedZoneId) {
  console.error("Error: tss.config.json must have project, backendRegion, domain, hostedZoneId");
  process.exit(1);
}

// Build edge-router with injected values
console.log("Building edge-router...");
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

await build({
  entryPoints: [path.join(ROOT, "lib/edge-router.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: path.join(DIST, "edge-router/index.js"),
  minify: true,
  sourcemap: false,
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
execSync(
  `npx cdk deploy ${project}-edge --app ./cdk.out --require-approval never`,
  { stdio: "inherit", cwd: ROOT }
);
