#!/usr/bin/env -S node --import tsx
// Unused-export detector — a validated wrapper over knip, scoped to the
// frontend workspace.
//
//   ./scripts/knip.ts                 # report unused exports + types (the CI gate)
//   ./scripts/knip.ts --all           # also report unused files, deps, and members
//   ./scripts/knip.ts --fix           # auto-remove what knip can safely delete
//
// The default `--include` is deliberately narrow: exports and types are the
// "pointless export" surface the gate cares about. `--all` widens it to knip's
// full report (unused files/deps/enum+class members) for a manual audit.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KNIP = path.join(ROOT, "node_modules", ".bin", "knip");
const FRONTEND = path.join(ROOT, "packages", "frontend");

interface Options {
  all: boolean;
  fix: boolean;
}

function usage(): string {
  return [
    "Usage: knip [options]",
    "",
    "  --all              report unused files/deps/members too (default: exports + types only)",
    "  --fix              auto-remove what knip can safely delete",
    "  -h, --help         show this help",
  ].join("\n");
}

function fail(message: string): never {
  console.error(`knip: ${message}\n\n${usage()}`);
  process.exit(2);
}

function parseOptions(argv: string[]): Options {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        "all": { type: "boolean" },
        "fix": { type: "boolean" },
        "help": { type: "boolean", short: "h" },
      },
    });
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
  const { values } = parsed;

  if (values.help) {
    console.log(usage());
    process.exit(0);
  }

  return { all: values.all ?? false, fix: values.fix ?? false };
}

function buildArgs(opts: Options): string[] {
  const args = ["--no-progress"];
  // The export/type surface — what "pointless export" means for the gate.
  if (!opts.all) args.push("--include", "exports,types,nsExports,nsTypes");
  if (opts.fix) args.push("--fix");
  return args;
}

function printToolOutput(output: string): void {
  if (output.length > 0) process.stderr.write(output.endsWith("\n") ? output : `${output}\n`);
}

function main(): void {
  if (!existsSync(KNIP)) fail("knip is not installed — run `npm install -D knip -w frontend`");
  const args = buildArgs(parseOptions(process.argv.slice(2)));
  const command = `knip ${args.join(" ")} (cwd: packages/frontend)`;
  try {
    execFileSync(KNIP, args, { cwd: FRONTEND, encoding: "utf-8" });
  } catch (err) {
    console.error(`knip: command failed: ${command}`);
    if (err instanceof Error && "stdout" in err && typeof err.stdout === "string") printToolOutput(err.stdout);
    if (err instanceof Error && "stderr" in err && typeof err.stderr === "string") printToolOutput(err.stderr);
    console.error("\nknip: unused exports found (see above). Inline single-use types or delete the export.");
    process.exitCode = 1;
  }
}

main();
