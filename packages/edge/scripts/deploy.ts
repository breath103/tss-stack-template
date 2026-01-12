import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";

import * as cdk from "aws-cdk-lib";
import { build } from "esbuild";

import { frontendBucketName, loadConfig, type TssConfig } from "@app/shared/config";

import { EdgeStack } from "./lib/edge-stack.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");

async function main() {
  const { command, dryRun } = parseCliArgs();

  const config = loadConfig();

  await buildEdgeFunctions({
    subdomainMap: config.subdomainMap,
    project: config.project,
    ssmRegion: config.ssm.region,
  });

  const stackId = synthesizeStack({
    project: config.project,
    ssmRegion: config.ssm.region,
    domain: config.domain,
    hostedZoneId: config.hostedZoneId,
    frontendBucketName: frontendBucketName(config),
  });

  switch (command) {
    case "deploy":
      await deploy(stackId, dryRun);
      break;
    case "destroy":
      await destroy(stackId);
      break;
  }
}

function parseCliArgs() {
  const { values, positionals } = parseArgs({
    options: {
      "dry-run": { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help) {
    showHelp();
  }

  const command = positionals[0];
  if (command !== "deploy" && command !== "destroy") {
    showHelp();
  }

  return { command: command as "deploy" | "destroy", dryRun: values["dry-run"] };
}

function showHelp(): never {
  console.log(`
Usage: npm run deploy -- <command> [options]

Deploy or destroy the edge stack (CloudFront, Lambda@Edge, S3, Route53)

Commands:
  deploy              Deploy the edge stack
  destroy             Destroy the edge stack (with confirmation)

Options:
  --dry-run           Build and synthesize only, skip actual deployment
  -h, --help          Show this help message

Examples:
  npm run deploy -- deploy
  npm run deploy -- deploy --dry-run
  npm run deploy -- destroy
`);
  process.exit(0);
}

interface BuildOptions {
  subdomainMap: TssConfig["subdomainMap"];
  project: string;
  ssmRegion: string;
}

async function buildEdgeFunctions(opts: BuildOptions): Promise<void> {
  console.log("Building edge functions...");
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // Build viewer-request CloudFront Function
  await build({
    entryPoints: [path.join(ROOT, "lib/viewer-request.ts")],
    bundle: true,
    platform: "neutral",
    target: "es2019",
    format: "esm",
    treeShaking: false,
    outfile: path.join(DIST, "viewer-request/index.js"),
    define: {
      SUBDOMAIN_MAP_CONFIG: JSON.stringify(opts.subdomainMap),
    },
  });

  // Build origin-request Lambda@Edge
  await build({
    entryPoints: [path.join(ROOT, "lib/origin-request.ts")],
    bundle: true,
    platform: "node",
    target: "node24",
    format: "cjs",
    outfile: path.join(DIST, "origin-request/index.js"),
    define: {
      "process.env.PROJECT": JSON.stringify(opts.project),
      "process.env.SSM_REGION": JSON.stringify(opts.ssmRegion),
    },
  });
}

import type { EdgeStackConfig } from "./lib/edge-stack.js";

function synthesizeStack(config: EdgeStackConfig): string {
  console.log(`  project: ${config.project}`);
  console.log(`  ssm.region: ${config.ssmRegion}`);
  console.log(`  domain: ${config.domain}`);
  console.log(`  hostedZoneId: ${config.hostedZoneId}`);

  const app = new cdk.App({ outdir: path.join(ROOT, "cdk.out") });
  const stackId = EdgeStack.id({ project: config.project });

  const stack = new EdgeStack(app, {
    config,
    env: { account: process.env.CDK_DEFAULT_ACCOUNT },
  });

  cdk.Tags.of(stack).add("project", config.project);
  app.synth();

  return stackId;
}

async function deploy(stackId: string, dryRun: boolean | undefined): Promise<void> {
  console.log(`\nDeploying ${stackId}...`);

  if (dryRun) {
    console.log("\n--dry-run: Skipping CDK deploy");
    console.log(`Built files in ${DIST}:`);
    execSync(`ls -la ${DIST}`, { stdio: "inherit" });
  } else {
    execSync(
      `npx cdk deploy ${stackId} --app ./cdk.out --require-approval never`,
      { stdio: "inherit", cwd: ROOT }
    );
  }
}

async function destroy(stackId: string): Promise<void> {
  console.log(`\nThis will destroy the stack: ${stackId}`);
  console.log("  - CloudFront distribution");
  console.log("  - Lambda@Edge functions");
  console.log("  - Route53 records");
  console.log("  - ACM certificate");

  const confirmed = await confirm("\nAre you sure you want to destroy?");
  if (!confirmed) {
    console.log("Aborted.");
    process.exit(0);
  }

  console.log(`\nDestroying ${stackId}...`);
  execSync(
    `npx cdk destroy ${stackId} --app ./cdk.out`,
    { stdio: "inherit", cwd: ROOT }
  );
}

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

main();
