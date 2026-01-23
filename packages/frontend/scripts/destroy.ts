import { parseArgs } from "node:util";

import { sanitizeBranchName } from "shared/branch";
import { frontendBucketName, loadConfig } from "shared/config";

import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

async function main() {
  const { name } = parseCliArgs();

  const config = loadConfig();
  const bucketName = frontendBucketName(config);
  const s3 = new S3Client({ region: "us-east-1" });

  console.log(`\nDeleting frontend assets from s3://${bucketName}/${name}/...`);
  await deletePrefix(s3, bucketName, name);

  console.log(`\n✅ Destroyed frontend: ${name}`);
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

Delete frontend assets from S3

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

main();
