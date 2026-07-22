#!/usr/bin/env -S node --import tsx
/**
 * Run every rule's check.sh and aggregate pass/fail.
 *
 *   ./check-all.ts                 # run all checks across all groups
 *   ./check-all.ts --group backend # run only backend checks
 *
 * Each check.sh exits 0 (pass) or non-zero (violations found) and prints
 * offending file:line on its own stdout. This runner prints a per-rule
 * PASS/FAIL line, echoes the output of any failing check, and exits non-zero
 * if any check failed. Rules without a check.sh are skipped (review by eye).
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { ruleDirs } from "./_lib";

// Anchor to this script's own dir so it works regardless of the caller's cwd.
const ROOT = __dirname;

function main(): void {
  const groupIdx = process.argv.indexOf("--group");
  const group = groupIdx >= 0 ? (process.argv[groupIdx + 1] ?? null) : null;

  const scripts = ruleDirs(ROOT, group)
    .map((d) => join(d, "check.sh"))
    .filter(existsSync);
  if (scripts.length === 0) {
    console.log("No check.sh scripts found.");
    return;
  }

  const failures: { rule: string; output: string }[] = [];
  for (const script of scripts) {
    const rule = script.replace(`${ROOT}/`, "").replace("/check.sh", "");
    const res = spawnSync("bash", [script], { encoding: "utf8" });
    if (res.status === 0) {
      console.log(`PASS  ${rule}`);
    } else {
      console.log(`FAIL  ${rule}`);
      failures.push({ rule, output: `${res.stdout}${res.stderr}`.trim() });
    }
  }

  if (failures.length > 0) {
    console.log(`\n${failures.length} of ${scripts.length} checks failed:\n`);
    for (const f of failures) {
      console.log(`── ${f.rule}`);
      console.log(`${f.output}\n`);
    }
    process.exit(1);
  }
  console.log(`\nAll ${scripts.length} checks passed.`);
}

main();
