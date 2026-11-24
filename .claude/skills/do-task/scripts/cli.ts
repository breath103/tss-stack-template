#!/usr/bin/env tsx

import { linkPr } from "./add-pr.ts";
import { commentPr } from "./comment-pr.ts";
import { CREATE_ISSUE_USAGE, createIssue } from "./create-issue.ts";
import { CREATE_PR_USAGE, createPr } from "./create-pr.ts";
import { landPr } from "./land-pr.ts";
import { requireUpToDateWithMain } from "./lib.ts";
import { listItems } from "./list-items.ts";
import { moveItem } from "./move-item.ts";
import { openFile } from "./open-file.ts";
import { openUrl } from "./open-url.ts";
import { resolveThreads } from "./resolve-threads.ts";
import { refresh, setup } from "./setup.ts";
import { updateIssue } from "./update-issue.ts";
import { viewIssue } from "./view-issue.ts";
import { waitForReview } from "./wait-for-review.ts";

const commands: Record<string, { run: (args: string[]) => void; usage: string }> = {
  setup: { run: setup, usage: "setup --project <project-url> --repo <owner/repo>" },
  refresh: { run: refresh, usage: "refresh" },
  "list-items": { run: listItems, usage: "list-items [--column <status>] [--limit <n>]" },
  "move-item": { run: moveItem, usage: "move-item --item <item-id> --column <status>" },
  "create-issue": { run: createIssue, usage: CREATE_ISSUE_USAGE },
  "view-issue": { run: viewIssue, usage: "view-issue --issue <issue-number-or-url>" },
  "update-issue": {
    run: updateIssue,
    usage: "update-issue --issue <number> [--title <title>] [--body <body> | --body-file <path>]",
  },
  "link-pr": { run: linkPr, usage: "link-pr --pr <pr-number> --issue <issue-number>" },
  "create-pr": { run: createPr, usage: CREATE_PR_USAGE },
  "wait-for-review": { run: waitForReview, usage: "wait-for-review [--pr <number>] [--since <iso>] [--interval <s>]" },
  "land-pr": { run: landPr, usage: "land-pr   (the current branch's PR; takes no options)" },
  "comment-pr": { run: commentPr, usage: "comment-pr --body <body> [--pr <number>]" },
  "resolve-threads": { run: resolveThreads, usage: "resolve-threads [--pr <number>]" },
  "open-url": { run: openUrl, usage: "open-url <url> [--chrome]" },
  "open-file": { run: openFile, usage: "open-file <path>" },
  "check-main": {
    run: requireUpToDateWithMain,
    usage: "check-main   (fetches origin/main; exits 1 with the rebase steps when this branch is behind it)",
  },
};

function main() {
  const [subcommand, ...rest] = process.argv.slice(2);
  const command = subcommand === undefined ? undefined : commands[subcommand];

  if (!command) {
    console.error(`Usage: cli.ts <command> [options]\n\nCommands: ${Object.keys(commands).join(", ")}`);
    process.exit(1);
  }

  // Answered here, before `run`: commands that parse no options (`land-pr`, `refresh`)
  // would otherwise execute for real on `--help`.
  if (rest.includes("--help") || rest.includes("-h")) {
    console.log(`Usage: cli.ts ${command.usage}`);
    return;
  }

  command.run(rest);
}

main();
