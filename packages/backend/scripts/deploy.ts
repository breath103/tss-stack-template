import { execSync } from "node:child_process";
import path from "node:path";
import { parseArgs } from "node:util";

import * as cdk from "aws-cdk-lib";
import { sanitizeBranchName } from "shared/branch";
import { loadConfig } from "shared/config";
import * as SSMParameters from "shared/ssm-parameters";

import { BackendStack } from "./lib/backend-stack.js";
import { loadEnv } from "./lib/env.js";

const ROOT = path.resolve(import.meta.dirname, "..");

function main() {
  const { name, env } = parseCliArgs();

  const envVars = loadEnv(env);
  build();

  const config = loadConfig();
  const stackName = synthesizeStack(config, name, envVars);

  deploy(stackName);
  storeUrlInSsm(stackName, name, config);

  console.log(`\n✅ Deployed backend: ${name}`);
}

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

Deploy backend to AWS Lambda

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

function build(): void {
  console.log("Building...");
  execSync("npm run build", { stdio: "inherit", cwd: ROOT });
}

function synthesizeStack(
  config: ReturnType<typeof loadConfig>,
  name: string,
  envVars: Record<string, string>
): string {
  console.log(`\nDeploying ${name} to ${config.backend.region} (project: ${config.project})...`);

  const app = new cdk.App({ outdir: path.join(ROOT, "cdk.out") });
  const stackId = BackendStack.id({ project: config.project, name });

  const stack = new BackendStack(app, {
    project: config.project,
    name,
    envVars,
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: config.backend.region,
    },
  });

  cdk.Tags.of(stack).add("project", config.project);
  cdk.Tags.of(stack).add("environment", name);

  app.synth();
  return stackId;
}

function deploy(stackName: string): void {
  execSync(
    `npx cdk deploy ${stackName} --app ./cdk.out --require-approval never`,
    { stdio: "inherit", cwd: ROOT }
  );
}

function storeUrlInSsm(
  stackName: string,
  name: string,
  config: ReturnType<typeof loadConfig>
): void {
  const functionUrl = execSync(
    `aws cloudformation describe-stacks --stack-name ${stackName} --query 'Stacks[0].Outputs[?OutputKey==\`FunctionUrl\`].OutputValue' --output text --region ${config.backend.region}`,
    { encoding: "utf-8" }
  ).trim();

  const ssmPath = SSMParameters.backendUrlName({
    project: config.project,
    sanitizedBranchName: name,
  });

  console.log(`\nStoring Function URL in SSM: ${ssmPath}`);
  execSync(
    `aws ssm put-parameter --name "${ssmPath}" --value "${functionUrl}" --type String --overwrite --region ${config.ssm.region}`,
    { stdio: "inherit" }
  );

  console.log(`\n✅ Deployed: ${functionUrl}`);
}

main();
