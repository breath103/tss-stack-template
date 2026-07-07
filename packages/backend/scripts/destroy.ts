#!/usr/bin/env -S node --import tsx
import { parseArgs } from "node:util";

import { sanitizeBranchName } from "shared/branch";
import { askConfirmation } from "shared/cli-utils";
import { loadConfig } from "shared/config";
import * as SSMParameters from "shared/ssm-parameters";

import {
  CloudFormationClient,
  CloudFormationServiceException,
  DeleteStackCommand,
  DescribeStacksCommand,
  waitUntilStackDeleteComplete,
} from "@aws-sdk/client-cloudformation";
import {
  DeleteParameterCommand,
  ParameterNotFound,
  SSMClient,
} from "@aws-sdk/client-ssm";

import { BackendStack } from "./lib/backend-stack.js";

async function main() {
  const { name, dryRun, skipPrompt } = parseCliArgs();

  const config = loadConfig();
  const stackName = BackendStack.id({ project: config.project, name });

  if (dryRun) {
    const exists = await stackExists(stackName, config.backend.region);
    if (exists) {
      console.log(`\n[dry-run] Backend stack exists: ${stackName}`);
      console.log("[dry-run] Would delete this stack and its SSM parameter.");
    } else {
      console.log(`\n[dry-run] Backend stack does not exist: ${stackName}`);
      console.log("[dry-run] Nothing to destroy.");
    }
    return;
  }

  console.log(`\nAbout to destroy backend stack: ${stackName}`);

  if (!skipPrompt) {
    const confirmed = await askConfirmation(
      `Are you sure you want to destroy "${name}"? (y/N): `
    );
    if (!confirmed) {
      console.log("Aborted.");
      return;
    }
  }

  console.log(`\nDestroying backend stack: ${stackName}`);

  await deleteStack(stackName, config.backend.region);
  await deleteSsmParameter(config, name);

  console.log(`\n✅ Destroyed backend: ${name}`);
}

async function stackExists(stackName: string, region: string): Promise<boolean> {
  const client = new CloudFormationClient({ region });

  try {
    await client.send(new DescribeStacksCommand({ StackName: stackName }));
    return true;
  } catch (error) {
    // DescribeStacks on a missing stack surfaces as a ValidationError, not a
    // dedicated exception class — there is no typed class for this case.
    if (
      error instanceof CloudFormationServiceException &&
      error.name === "ValidationError"
    ) {
      return false;
    }
    throw error;
  }
}

function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      "name": { type: "string", short: "n" },
      "dry-run": { type: "boolean" },
      "skip-prompt": { type: "boolean" },
      "help": { type: "boolean", short: "h" },
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

  return {
    name: sanitizedName,
    dryRun: values["dry-run"] ?? false,
    skipPrompt: values["skip-prompt"] ?? false,
  };
}

function showHelp(): never {
  console.log(`
Usage: ./packages/backend/scripts/destroy.ts [options]

Destroy backend stack from AWS

Options:
  -n, --name <name>   Deployment name (required)
                      Usually the branch name (e.g., feature-branch)
      --dry-run       Check whether the stack exists and report what would be
                      destroyed, without deleting anything
      --skip-prompt   Skip the confirmation prompt (for non-interactive/CI use)
  -h, --help          Show this help message

Examples:
  ./packages/backend/scripts/destroy.ts --name=feature-branch
  ./packages/backend/scripts/destroy.ts -n feature/my-feature --dry-run
  ./packages/backend/scripts/destroy.ts -n feature/my-feature --skip-prompt
`);
  process.exit(0);
}

async function deleteStack(stackName: string, region: string): Promise<void> {
  const client = new CloudFormationClient({ region });

  console.log(`Deleting CloudFormation stack: ${stackName}...`);

  await client.send(new DeleteStackCommand({ StackName: stackName }));

  console.log("Waiting for stack deletion to complete...");
  await waitUntilStackDeleteComplete(
    { client, maxWaitTime: 600 },
    { StackName: stackName }
  );

  console.log(`Stack ${stackName} deleted successfully`);
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
    if (error instanceof ParameterNotFound) {
      console.log(`Note: SSM parameter ${ssmPath} does not exist`);
    } else {
      throw error;
    }
  }
}

void main();
