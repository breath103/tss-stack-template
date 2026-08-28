#!/usr/bin/env -S node --import tsx
/**
 * Run every rule's check.sh and aggregate pass/fail.
 *
 *   ./check-all.ts                 # run all checks across all groups
 *   ./check-all.ts --group backend # run only backend checks
 *
 * Each check.sh exits 0 (pass) or non-zero (violations found) and prints
 * offending file:line on its own stdout. Passing rules are counted, never
 * named — this output is read by an agent, and a wall of PASS lines is context
 * spent on nothing actionable. Only failures get named, each with its check's
 * output indented under it. Exits non-zero if any check failed. Rules without a
 * check.sh are skipped (review by eye).
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { ruleDirs } from "./_lib";

// Anchor to this script's own dir so it works regardless of the caller's cwd.
const ROOT = __dirname;

// ANSI only on a TTY: piped/redirected output is read by an agent, and escape
// codes are noise there.
const COLOR = process.stdout.isTTY === true;
const bold = (s: string): string => (COLOR ? `\x1b[1m${s}\x1b[0m` : s);
const red = (s: string): string => (COLOR ? `\x1b[31m${s}\x1b[0m` : s);

function indent(output: string): string {
  return output
    .split("\n")
    .map(line => `    ${line}`)
    .join("\n");
}

function main(): void {
  const groupIdx = process.argv.indexOf("--group");
  const group = groupIdx >= 0 ? (process.argv[groupIdx + 1] ?? null) : null;

  const scripts = ruleDirs(ROOT, group)
    .map(d => join(d, "check.sh"))
    .filter(existsSync);
  if (scripts.length === 0) {
    console.log("No check.sh scripts found.");
    return;
  }

  const failures: { rule: string; output: string }[] = [];
  for (const script of scripts) {
    const rule = script.replace(`${ROOT}/`, "").replace("/check.sh", "");
    const res = spawnSync("bash", [script], { encoding: "utf8" });
    if (res.status !== 0) {
      failures.push({ rule, output: `${res.stdout}${res.stderr}`.trim() });
    }
  }

  const passed = `Passed: ${scripts.length - failures.length}`;
  if (failures.length === 0) {
    console.log(`${passed}, Failed: 0`);
    return;
  }

  console.log(`${passed}, ${red(`Failed: ${failures.length}`)}\n`);
  console.log("Failed:");
  failures.forEach((f, i) => {
    console.log(`${i > 0 ? "\n" : ""}- ${bold(f.rule)}`);
    if (f.output) console.log(indent(f.output));
  });
  process.exit(1);
}

main();
