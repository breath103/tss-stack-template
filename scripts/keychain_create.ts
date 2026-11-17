#!/usr/bin/env -S node --import tsx
// Create development.keychain-db. macOS asks for its new password.
//
//   ./scripts/keychain_create.ts
import { DevKeychain } from "./keychain/dev-keychain.js";

function main(): void {
  new DevKeychain().create();
  console.log("created development.keychain-db — add items with ./scripts/keychain_set.ts <NAME>, then commit it");
}

main();
