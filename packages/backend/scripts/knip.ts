#!/usr/bin/env -S node --import tsx
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const ROOT = path.resolve(import.meta.dirname, "..");
const KNIP = [
  path.join(ROOT, "node_modules/.bin/knip"),
  path.join(ROOT, "../../node_modules/.bin/knip"),
].find(existsSync);

function usage(): string {
  return [
    "Usage: backend-knip [options]",
    "",
    "  --all              report unused files/deps/members too (default: exports + types only)",
    "  --fix              auto-remove what knip can safely delete",
    "  -h, --help         show this help",
  ].join("\n");
}

function fail(message: string): never {
  console.error(`backend-knip: ${message}\n\n${usage()}`);
  process.exit(2);
}

function buildArgs(argv: string[]): string[] {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        all: { type: "boolean" },
        fix: { type: "boolean" },
        help: { type: "boolean", short: "h" },
      },
    });
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }

  if (parsed.values.help) {
    console.log(usage());
    process.exit(0);
  }

  return [
    "--no-progress",
    ...(parsed.values.all ? [] : ["--include", "exports,types,nsExports,nsTypes"]),
    ...(parsed.values.fix ? ["--fix"] : []),
  ];
}

function printToolOutput(output: string): void {
  if (output.length > 0) process.stderr.write(output.endsWith("\n") ? output : `${output}\n`);
}

function main(): void {
  if (!KNIP) fail("knip is not installed — run `npm install -D knip -w backend`");
  const args = buildArgs(process.argv.slice(2));
  const command = `knip ${args.join(" ")} (cwd: packages/backend)`;
  try {
    execFileSync(KNIP, args, { cwd: ROOT, encoding: "utf-8" });
  } catch (err) {
    console.error(`backend-knip: command failed: ${command}`);
    if (err instanceof Error && "stdout" in err && typeof err.stdout === "string") printToolOutput(err.stdout);
    if (err instanceof Error && "stderr" in err && typeof err.stderr === "string") printToolOutput(err.stderr);
    console.error("\nbackend-knip: unused code found (see above). Remove it or add a narrow config exception for shared-boundary usage.");
    process.exitCode = 1;
  }
}

main();
