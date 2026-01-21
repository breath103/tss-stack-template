import { parseArgs } from "node:util";

import { sanitizeBranchName } from "@app/shared/branch";
import { loadConfig } from "@app/shared/config";
import * as SSMParameters from "@app/shared/ssm-parameters";
import {
  CloudFormationClient,
  DeleteStackCommand,
  waitUntilStackDeleteComplete,
} from "@aws-sdk/client-cloudformation";
import { DeleteParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

import { BackendStack } from "./lib/backend-stack.js";

async function main() {
  const { name } = parseCliArgs();

  const config = loadConfig();
  const stackName = BackendStack.id({ project: config.project, name });

  console.log(`\nDestroying backend stack: ${stackName}`);

  await deleteStack(stackName, config.backend.region);
  await deleteSsmParameter(config, name);

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

async function deleteStack(stackName: string, region: string): Promise<void> {
  const client = new CloudFormationClient({ region });

  console.log(`Deleting CloudFormation stack: ${stackName}...`);

  try {
    await client.send(new DeleteStackCommand({ StackName: stackName }));

    console.log("Waiting for stack deletion to complete...");
    await waitUntilStackDeleteComplete(
      { client, maxWaitTime: 600 },
      { StackName: stackName }
    );

    console.log(`Stack ${stackName} deleted successfully`);
  } catch (error) {
    // Stack might not exist, which is fine
    if (error instanceof Error && error.name === "ValidationError") {
      console.log(`Note: Stack ${stackName} does not exist`);
    } else {
      throw error;
    }
  }
}

async function deleteSsmParameter(
  config: ReturnType<typeof loadConfig>,
  name: string
): Promise<void> {
  const client = new SSMClient({ region: config.ssm.region });
  const ssmPath = SSMParameters.backendUrlName({
    project: config.project,
    sanitizedBranchName: name,
  });

  console.log(`\nDeleting SSM parameter: ${ssmPath}`);

  try {
    await client.send(new DeleteParameterCommand({ Name: ssmPath }));
    console.log(`SSM parameter ${ssmPath} deleted successfully`);
  } catch (error) {
    // Parameter might not exist, which is fine
    if (error instanceof Error && error.name === "ParameterNotFound") {
      console.log(`Note: SSM parameter ${ssmPath} does not exist`);
    } else {
      throw error;
    }
  }
}

main();
