import { execSync } from "node:child_process";
import { parseArgs } from "node:util";

import { sanitizeBranchName } from "@app/shared/branch";
import { loadConfig } from "@app/shared/config";
import * as SSMParameters from "@app/shared/ssm-parameters";

import { BackendStack } from "./lib/backend-stack.js";

function main() {
  const { name } = parseCliArgs();

  const config = loadConfig();
  const stackName = BackendStack.id({ project: config.project, name });

  console.log(`\nDestroying backend stack: ${stackName}`);

  deleteStack(stackName, config.backend.region);
  deleteSsmParameter(config, name);

  console.log(`\n✅ Destroyed backend: ${name}`);
}

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      name: { type: "string", short: "n" },
      help: { type: "boolean", short: "h" },
    },
    strict: true,
  });

  if (values.help) {
    showHelp();
  }

  if (!values.name) {
    console.error("Error: --name is required (e.g., --name=feature-branch)");
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

  return { name: sanitizedName };
}

function showHelp(): never {
  console.log(`
Usage: npm run destroy -- [options]

Destroy backend stack from AWS

Options:
  -n, --name <name>   Deployment name (required)
                      Usually the branch name (e.g., feature-branch)
  -h, --help          Show this help message

Examples:
  npm run destroy -- --name=feature-branch
  npm run destroy -- -n feature/my-feature
`);
  process.exit(0);
}

function deleteStack(stackName: string, region: string): void {
  console.log(`Deleting CloudFormation stack: ${stackName}...`);

  try {
    execSync(
      `aws cloudformation delete-stack --stack-name ${stackName} --region ${region}`,
      { stdio: "inherit" }
    );

    console.log("Waiting for stack deletion to complete...");
    execSync(
      `aws cloudformation wait stack-delete-complete --stack-name ${stackName} --region ${region}`,
      { stdio: "inherit" }
    );

    console.log(`Stack ${stackName} deleted successfully`);
  } catch {
    // Stack might not exist, which is fine
    console.log(`Note: Stack ${stackName} may not exist or already deleted`);
  }
}

function deleteSsmParameter(config: ReturnType<typeof loadConfig>, name: string): void {
  const ssmPath = SSMParameters.backendUrlName({
    project: config.project,
    sanitizedBranchName: name,
  });

  console.log(`\nDeleting SSM parameter: ${ssmPath}`);

  try {
    execSync(
      `aws ssm delete-parameter --name "${ssmPath}" --region ${config.ssm.region}`,
      { stdio: "inherit" }
    );
    console.log(`SSM parameter ${ssmPath} deleted successfully`);
  } catch {
    // Parameter might not exist, which is fine
    console.log(`Note: SSM parameter ${ssmPath} may not exist or already deleted`);
  }
}

main();
