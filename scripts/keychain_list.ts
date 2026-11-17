#!/usr/bin/env -S node --import tsx
// List the item names in development.keychain-db. Never prints a value.
//
//   ./scripts/keychain_list.ts
import { DevKeychain } from "./keychain/dev-keychain.js";

function main(): void {
  console.log(new DevKeychain().names().join("\n"));
}

main();
