#!/usr/bin/env -S node --import tsx
// Unused-export detector for the packages that have a knip config.
//
//   ./scripts/knip.ts                 # every target — exports + types (the CI gate)
//   ./scripts/knip.ts backend         # one target
//   ./scripts/knip.ts --all           # also report unused files, deps, and members
//   ./scripts/knip.ts --fix           # auto-remove what knip can safely delete
//
// The default `--include` is deliberately narrow: exports and types are the
// "pointless export" surface the gate cares about. `--all` widens it to knip's
// full report (unused files/deps/enum+class members) for a manual audit.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { resolveBin } from "shared/cli-utils";

/**
 * Every package knip runs against. **Single source of truth**, same as `LINT_TREES` in
 * `lint.ts`: one entrypoint, so a package cannot be added to one knip runner and not another.
 *
 * Only these two have a knip config (`knip.json`, or a `knip` block in `package.json`);
 * knip needs one to know a package's entrypoints, so adding a target here means adding
 * that config too.
 *
 * `production: true` restricts the graph to what actually ships and additionally reports
 * unused FILES — wrong for these two, where tests and tooling are legitimate entrypoints.
 */
const KNIP_TARGETS = {
  backend: { dir: "packages/backend", production: false },
  frontend: { dir: "packages/frontend", production: false },
} as const satisfies Record<string, { dir: string; production: boolean }>;

type KnipTarget = keyof typeof KNIP_TARGETS;

const TARGET_NAMES = Object.keys(KNIP_TARGETS) as KnipTarget[];

const REPO_ROOT = path.resolve(import.meta.dirname, "..");

function usage(): string {
  return [
    "Usage: knip [target...] [options]",
    "",
    `  target             one or more of: ${TARGET_NAMES.join(", ")} (default: all)`,
    "  --all              report unused files/deps/members too (default: exports + types only)",
    "  --fix              auto-remove what knip can safely delete",
    "  -h, --help         show this help",
  ].join("\n");
}

function fail(message: string): never {
  console.error(`knip: ${message}\n\n${usage()}`);
  process.exit(2);
}

function buildArgs({ all, fix, production }: { all: boolean; fix: boolean; production: boolean }): string[] {
  const args = ["--no-progress"];
  if (production) args.push("--production");
  if (!all) {
    args.push("--include", production ? "files,exports,types,nsExports,nsTypes" : "exports,types,nsExports,nsTypes");
  }
  if (fix) args.push("--fix");
  return args;
}

function printToolOutput(output: unknown): void {
  if (typeof output === "string" && output.length > 0) {
    process.stderr.write(output.endsWith("\n") ? output : `${output}\n`);
  }
}

/** Run knip in one target. Returns true when clean. */
function knipTarget(name: KnipTarget, opts: { all: boolean; fix: boolean }): boolean {
  const { dir, production } = KNIP_TARGETS[name];
  const cwd = path.join(REPO_ROOT, dir);
  const args = buildArgs({ ...opts, production });
  try {
    execFileSync(resolveBin("knip", cwd), args, { cwd, encoding: "utf-8" });
    return true;
  } catch (err) {
    console.error(`\n── ${name}  (FAILED)\nknip ${args.join(" ")}  (cwd: ${dir})`);
    if (err instanceof Error && "stdout" in err) printToolOutput(err.stdout);
    if (err instanceof Error && "stderr" in err) printToolOutput(err.stderr);
    return false;
  }
}

/**
 * Exported types nothing outside their own file names.
 *
 * knip cannot see these — one reference from a reachable export in the same file is enough
 * for it to call the type used, under every `ignoreExportsUsedInFile` setting. Nor can the
 * `no-single-use-type` oxlint rule, which skips exported declarations precisely because a
 * per-file rule cannot know who imports them: of the exported types referenced once in their
 * own file, two thirds ARE imported elsewhere. Only a repo-wide pass separates the two.
 */
class LocalOnlyExportedTypes {
  /** `file:line  Name`, empty when clean. */
  static findings(): string[] {
    const sources = new Map(LocalOnlyExportedTypes.files().map(file => [file, LocalOnlyExportedTypes.code(file)]));
    const found: string[] = [];
    for (const [file, source] of sources) {
      for (const match of source.matchAll(/^export (?:interface|type) (\w+)/gm)) {
        // `@public` is the escape hatch, and the only one: a type nothing imports can still
        // be structurally required by `--emitDeclarationOnly` — TS4023, "has or is using name
        // X but cannot be named" — when it appears in an exported symbol's inferred type.
        if (/@public/.test(LocalOnlyExportedTypes.docComment(file, match.index))) continue;
        const named = new RegExp(`\\b${match[1]}\\b`);
        if ([...sources].some(([other, code]) => other !== file && named.test(code))) continue;
        found.push(`${file}:${source.slice(0, match.index).split("\n").length}  ${match[1]}`);
      }
    }
    return found;
  }

  /** The raw text just above the declaration, where a `@public` tag would sit. */
  private static docComment(file: string, at: number): string {
    const raw = fs.readFileSync(path.join(REPO_ROOT, file), "utf-8");
    return raw.slice(Math.max(0, at - 400), at);
  }

  private static files(): string[] {
    const tracked = execFileSync("git", ["ls-files"], { cwd: REPO_ROOT, encoding: "utf-8" });
    // Generated files declare a type per table, most of them referenced nowhere else.
    return tracked.split("\n").filter(file => /\.tsx?$/.test(file) && !/\.generated\./.test(file));
  }

  /**
   * Source with comments and string bodies blanked, so a name that appears in prose or in a
   * template literal does not read as a reference. Newlines survive, keeping line numbers.
   */
  private static code(file: string): string {
    const raw = fs.readFileSync(path.join(REPO_ROOT, file), "utf-8");
    return raw.replaceAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|(['"`])(?:\\.|(?!\1)[\s\S])*?\1/g, blanked =>
      blanked.replaceAll(/[^\n]/g, " ")
    );
  }
}

function main(): void {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      allowPositionals: true,
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
    return;
  }

  const unknown = parsed.positionals.filter(name => !(name in KNIP_TARGETS));
  if (unknown.length > 0) fail(`unknown target(s): ${unknown.join(", ")}`);

  const names = parsed.positionals.length > 0 ? (parsed.positionals as KnipTarget[]) : TARGET_NAMES;
  const opts = { all: parsed.values.all ?? false, fix: parsed.values.fix ?? false };

  // Every target runs even after one fails, so a single pass reports all of them.
  const failed = names.filter(name => !knipTarget(name, opts));
  if (failed.length > 0) {
    console.error(
      `\nknip: unused code found in: ${failed.join(", ")}. Delete it, make the entrypoint explicit, or add a narrow config exception for shared-boundary usage.`
    );
    process.exit(1);
  }

  const localOnly = LocalOnlyExportedTypes.findings();
  if (localOnly.length > 0) {
    console.error(
      `\n── exported types nothing else imports (${localOnly.length})\n${localOnly.map(f => `  ${f}`).join("\n")}` +
        `\n\nDrop the \`export\`, or inline the type at its one use site.`
    );
    process.exit(1);
  }

  console.log(`knip clean: ${names.join(", ")}`);
}

main();
