#!/usr/bin/env -S node --import tsx
import { parseArgs } from "node:util";

import { sanitizeBranchName } from "shared/branch";
import { askConfirmation } from "shared/cli-utils";
import { frontendBucketName, loadConfig } from "shared/config";

import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

async function main() {
  const { name, dryRun, skipPrompt } = parseCliArgs();

  const config = loadConfig();
  const bucketName = frontendBucketName(config);
  const s3 = new S3Client({ region: "us-east-1" });

  const count = await countPrefix(s3, bucketName, name);
  if (count === 0) {
    console.log(`\nNo objects under s3://${bucketName}/${name}/`);
    console.log("Nothing to destroy.");
    return;
  }

  console.log(`\n${count} object(s) under s3://${bucketName}/${name}/`);
  console.log("Would delete these objects.");

  if (dryRun) {
    return;
  }

  if (!skipPrompt) {
    const confirmed = await askConfirmation(
      `Are you sure you want to destroy "${name}"? (y/N): `
    );
    if (!confirmed) {
      console.log("Aborted.");
      return;
    }
  }

  console.log(`\nDeleting frontend assets from s3://${bucketName}/${name}/...`);
  await deletePrefix(s3, bucketName, name);

  console.log(`\n✅ Destroyed frontend: ${name}`);
}

async function countPrefix(s3: S3Client, bucket: string, prefix: string): Promise<number> {
  let continuationToken: string | undefined;
  let total = 0;

  do {
    const listResponse = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: `${prefix}/`,
        ContinuationToken: continuationToken,
      })
    );
    total += listResponse.Contents?.length ?? 0;
    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);

  return total;
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
Usage: ./packages/frontend/scripts/destroy.ts [options]

Delete frontend assets from S3

Options:
  -n, --name <name>   Deployment name (required)
                      Usually the branch name (e.g., feature-branch)
      --dry-run       Check whether assets exist and report what would be
                      destroyed, without deleting anything
      --skip-prompt   Skip the confirmation prompt (for non-interactive/CI use)
  -h, --help          Show this help message

Examples:
  ./packages/frontend/scripts/destroy.ts --name=feature-branch
  ./packages/frontend/scripts/destroy.ts -n feature/my-feature --dry-run
  ./packages/frontend/scripts/destroy.ts -n feature/my-feature --skip-prompt
`);
  process.exit(0);
}

async function deletePrefix(s3: S3Client, bucket: string, prefix: string): Promise<void> {
  let continuationToken: string | undefined;
  let totalDeleted = 0;

  do {
    const listResponse = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: `${prefix}/`,
        ContinuationToken: continuationToken,
      })
    );

    const objects = listResponse.Contents;
    if (!objects || objects.length === 0) {
      if (totalDeleted === 0) {
        console.log(`No objects found with prefix: ${prefix}/`);
      }
      break;
    }

    const deleteParams = {
      Bucket: bucket,
      Delete: {
        Objects: objects.map((obj) => ({ Key: obj.Key! })),
        Quiet: true,
      },
    };

    await s3.send(new DeleteObjectsCommand(deleteParams));
    totalDeleted += objects.length;
    console.log(`  Deleted ${objects.length} objects (total: ${totalDeleted})`);

    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);

  if (totalDeleted > 0) {
    console.log(`Deleted ${totalDeleted} objects from s3://${bucket}/${prefix}/`);
  }
}

void main();
