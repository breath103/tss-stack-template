#!/usr/bin/env -S node --import tsx
// Store one item in development.keychain-db. The value is typed into a macOS dialog.
//
//   ./scripts/keychain_set.ts ANALYTICS_API_KEY
import { parseArgs } from "node:util";

import { DevKeychain } from "./keychain/dev-keychain.js";

function main(): void {
  const { positionals } = parseArgs({ allowPositionals: true });
  if (positionals.length !== 1) {
    console.error("Usage: ./scripts/keychain_set.ts <NAME>");
    process.exit(2);
  }
  new DevKeychain().set(positionals[0]);
  console.log(`stored ${positionals[0]} — commit development.keychain-db`);
}

main();
