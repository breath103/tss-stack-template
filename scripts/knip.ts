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
import { existsSync, readFileSync } from "node:fs";
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
        all: { type: "boolean" },
        fix: { type: "boolean" },
        help: { type: "boolean", short: "h" },
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

/**
 * Exported types nothing outside their own file names.
 *
 * knip cannot see these — one reference from a reachable export in the same file is enough
 * for it to call the type used, under every `ignoreExportsUsedInFile` setting. Nor can the
 * `no-single-use-type` oxlint rule, which skips exported declarations precisely because a
 * per-file rule cannot know who imports them. Only a repo-wide pass separates the two.
 */
class LocalOnlyExportedTypes {
  private static readonly DECLARATION = /^export (?:interface|type) (\w+)/gm;

  /** Generated files declare a type per table, most of them referenced nowhere else. */
  private static readonly GENERATED = /\.generated\./;

  /**
   * The escape hatch, and the only one: a type nothing imports can still be structurally
   * required by `--emitDeclarationOnly` — TS4023, "has or is using name X but cannot be
   * named" — when it appears in an exported symbol's inferred type. Tag those `@public`.
   */
  private static readonly PUBLIC = /@public/;

  /** `file:line  Name`, empty when clean. */
  static findings(): string[] {
    const sources = new Map(LocalOnlyExportedTypes.files().map(file => [file, LocalOnlyExportedTypes.code(file)]));
    const found: string[] = [];
    for (const [file, source] of sources) {
      for (const match of source.matchAll(LocalOnlyExportedTypes.DECLARATION)) {
        if (LocalOnlyExportedTypes.PUBLIC.test(LocalOnlyExportedTypes.docComment(file, match.index))) continue;
        const named = new RegExp(`\\b${match[1]}\\b`);
        if ([...sources].some(([other, code]) => other !== file && named.test(code))) continue;
        found.push(`${file}:${source.slice(0, match.index).split("\n").length}  ${match[1]}`);
      }
    }
    return found;
  }

  /** The raw text just above the declaration, where a `@public` tag would sit. */
  private static docComment(file: string, at: number): string {
    return readFileSync(path.join(ROOT, file), "utf-8").slice(Math.max(0, at - 400), at);
  }

  private static files(): string[] {
    const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf-8" });
    return tracked.split("\n").filter(file => /\.tsx?$/.test(file) && !LocalOnlyExportedTypes.GENERATED.test(file));
  }

  /**
   * Source with comments and string bodies blanked, so a name that appears in prose or in a
   * template literal does not read as a reference. Newlines survive, keeping line numbers.
   */
  private static code(file: string): string {
    const raw = readFileSync(path.join(ROOT, file), "utf-8");
    return raw.replaceAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|(['"`])(?:\\.|(?!\1)[\s\S])*?\1/g, blanked =>
      blanked.replaceAll(/[^\n]/g, " ")
    );
  }
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
    return;
  }

  const localOnly = LocalOnlyExportedTypes.findings();
  if (localOnly.length > 0) {
    console.error(
      `\n── exported types nothing else imports (${localOnly.length})\n${localOnly.map(f => `  ${f}`).join("\n")}` +
        `\n\nDrop the \`export\`, or inline the type at its one use site.`
    );
    process.exitCode = 1;
  }
}

main();
