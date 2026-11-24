#!/usr/bin/env -S node --import tsx
// Before writing a component or a label map for an entity: what already draws it, anywhere in
// the frontend (routes/ as well as components/) and modules/ui.
//
//   ./scripts/find_existing.ts InvitationRow     # a component name you are about to write
//   ./scripts/find_existing.ts tool              # or just the entity
//   ./scripts/find_existing.ts "Not connected"   # or a label you are about to add to an i18n file
import { ExistingCode } from "./lib/existing_code.js";

const MAX_LISTED = 15;

function main(): void {
  const query = process.argv.slice(2).join(" ").trim();
  if (query === "") {
    console.error('Usage: ./scripts/find_existing.ts <ComponentName | entity | "label text">');
    process.exit(1);
  }
  const existing = ExistingCode.forRepo();
  const name = /\s/.test(query) ? null : query[0].toUpperCase() + query.slice(1);

  const components = name === null ? [] : existing.similarComponents(name, null);
  const labels = [
    ...existing.sameLabel(query, null).map(({ key, file }) => `${key} = "${query}" (${file})`),
    ...(name === null
      ? []
      : existing.labelKeysNamed(query).map(({ key, file, value }) => `${key} = "${value}" (${file})`)),
  ];

  if (components.length > 0) {
    console.log(`Components that already draw this (${components.length}), closest first:`);
    for (const { name: found, file, line } of components.slice(0, MAX_LISTED))
      console.log(`  ${found} (${file}:${line})`);
    if (components.length > MAX_LISTED) console.log(`  … and ${components.length - MAX_LISTED} more`);
  }
  if (labels.length > 0) {
    console.log(`${components.length > 0 ? "\n" : ""}i18n labels (${labels.length}):`);
    for (const label of labels.slice(0, MAX_LISTED)) console.log(`  ${label}`);
    if (labels.length > MAX_LISTED) console.log(`  … and ${labels.length - MAX_LISTED} more`);
  }
  if (components.length === 0 && labels.length === 0) {
    console.log(`Nothing in ${ExistingCode.TREES.join(" or ")} is named after "${query}".`);
    return;
  }
  console.log("\nReuse or extend one of these. A different layout is a variant or a slot on the existing");
  console.log("component, not a second one; one in another route folder moves to components/<entity>/.");
}

main();
