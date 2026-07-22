#!/usr/bin/env tsx

import { setup, refresh } from "./setup.ts";
import { listItems } from "./list-items.ts";
import { moveItem } from "./move-item.ts";
import { createIssue } from "./create-issue.ts";
import { viewIssue } from "./view-issue.ts";
import { linkPr } from "./add-pr.ts";
import { createPr } from "./create-pr.ts";
import { waitForReview } from "./wait-for-review.ts";
import { landPr } from "./land-pr.ts";
import { commentPr } from "./comment-pr.ts";
import { updateIssue } from "./update-issue.ts";
import { resolveThreads } from "./resolve-threads.ts";

const commands: Record<string, (args: string[]) => void> = {
  setup,
  refresh,
  "list-items": listItems,
  "move-item": moveItem,
  "create-issue": createIssue,
  "view-issue": viewIssue,
  "update-issue": updateIssue,
  "link-pr": linkPr,
  "create-pr": createPr,
  "wait-for-review": waitForReview,
  "land-pr": landPr,
  "comment-pr": commentPr,
  "resolve-threads": resolveThreads,
};

function main() {
  const [subcommand, ...rest] = process.argv.slice(2);

  if (!subcommand || !commands[subcommand]) {
    console.error(`Usage: cli.ts <command> [options]\n\nCommands: ${Object.keys(commands).join(", ")}`);
    process.exit(1);
  }

  commands[subcommand](rest);
}

main();
