#!/usr/bin/env -S node --import tsx
// Run a command with items from development.keychain-db as environment variables.
//
//   ./scripts/keychain_exec.ts ANALYTICS_API_KEY -- sh -c 'curl -H "Authorization: Bearer $ANALYTICS_API_KEY" …'
//
// Single-quote the command: the variable must be expanded by the child, not by your shell.
import { spawnSync } from "node:child_process";

import { DevKeychain } from "./keychain/dev-keychain.js";

function main(): void {
  const args = process.argv.slice(2);
  const separator = args.indexOf("--");
  if (separator < 1 || separator === args.length - 1) {
    console.error("Usage: ./scripts/keychain_exec.ts <NAME>... -- <command> [args]");
    process.exit(2);
  }
  const [command, ...commandArgs] = args.slice(separator + 1);

  const child = spawnSync(command, commandArgs, {
    stdio: "inherit",
    env: { ...process.env, ...new DevKeychain().secrets(args.slice(0, separator)) },
  });
  if (child.error) throw child.error;
  process.exit(child.status ?? 1);
}

main();
