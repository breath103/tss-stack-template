#!/usr/bin/env -S node --import tsx
// Print every coding guide as `<n>. <title>` under its topic. Read the ones that matter with
// `./scripts/show_guides.ts <n>,<n>,…`.
import { GuideRecheck } from "./lib/guide_recheck.js";
import { Guides } from "./lib/guides.js";

function main(): void {
  GuideRecheck.forRepo().begin();
  console.log(Guides.listing(Guides.forRepo().all()));
}

main();
