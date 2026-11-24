#!/usr/bin/env -S node --import tsx
import { execFileSync, spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { resolveBin } from "shared/cli-utils";
import { findUiGlyphInLabel } from "shared/ui-glyphs";

import { ExistingCode } from "./lib/existing_code.js";

/**
 * Every tree in the repo that gets linted, and how. **This is the single source of
 * truth** — CI runs this script over all of it, so a package is either listed here or
 * linted by nothing.
 *
 * `checks` is required rather than an optional `formatOnly?: true`, so every entry
 * states its tier and a new tree cannot default into the wrong one by omission.
 */
// `seconds` is the tree's measured `./scripts/lint.ts <tree>` time on a laptop; `--shard`
// packs trees by it. Re-measure when a tree's lint time moves by a second or more.
const LINT_TREES = {
  backend: { dir: "packages/backend", targets: ["src", "scripts"], checks: "all", seconds: 1.0 },
  frontend: { dir: "packages/frontend", targets: ["src", "scripts", "vite.config.ts"], checks: "all", seconds: 2.0 },
  edge: { dir: "packages/edge", targets: ["src", "scripts"], checks: "all", seconds: 0.4 },
  shared: { dir: "packages/shared", targets: ["src"], checks: "all", seconds: 0.3 },
  ui: { dir: "modules/ui", targets: ["src"], checks: "all", seconds: 1.5 },
  e2e: { dir: "e2e", targets: ["."], checks: "all", seconds: 0.4 },
  scripts: { dir: ".", targets: ["scripts", "documents/coding-guidelines"], checks: "all", seconds: 0.4 },
  skills: { dir: ".", targets: [".claude/skills"], checks: "all", seconds: 0.4 },
  // Format-only: untyped `.mjs` that CI runs directly. It sits in no TS program, so
  // oxlint's type-aware pass would read every expression in it as `error`-typed.
  "github-scripts": { dir: ".", targets: [".github/scripts"], checks: "format", seconds: 0.1 },
} as const satisfies Record<
  string,
  { dir: string; targets: readonly string[]; checks: "all" | "format"; seconds: number }
>;

type LintTreeName = keyof typeof LINT_TREES;

const TREE_NAMES = Object.keys(LINT_TREES) as LintTreeName[];

const REPO_ROOT = path.resolve(import.meta.dirname, "..");

/** Run a binary, capturing output instead of inheriting it (concurrent runs interleave). */
function run(bin: string, args: string[], cwd: string): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(resolveBin(bin, cwd), args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", chunk => (output += String(chunk)));
    child.stderr.on("data", chunk => (output += String(chunk)));
    child.on("error", reject);
    child.on("close", code => resolve({ ok: code === 0, output }));
  });
}

/**
 * Trees of shard `index` (1-based) of `total`: costliest tree first, each into the shard
 * with the least `seconds` so far.
 *
 * The shards are DERIVED from `LINT_TREES`, never listed in the workflow. A matrix that
 * named trees would be a second source of truth.
 */
function shardOf(index: number, total: number): LintTreeName[] {
  const shards = Array.from({ length: total }, () => ({ seconds: 0, names: [] as LintTreeName[] }));
  for (const name of [...TREE_NAMES].sort((a, b) => LINT_TREES[b].seconds - LINT_TREES[a].seconds)) {
    const lightest = shards.reduce((min, shard) => (shard.seconds < min.seconds ? shard : min));
    lightest.seconds += LINT_TREES[name].seconds;
    lightest.names.push(name);
  }
  return shards[index - 1].names;
}

/**
 * oxlint one tree, in that tree's directory.
 *
 * Per-tree invocation is required for config resolution (each tree needs its own cwd for
 * `.oxlintrc.json` and `tailwindcss.entryPoint`) and is also faster: one invocation over
 * every path builds a single type-aware program spanning every package, while per-tree
 * runs get small programs that overlap. Do not merge this into a single call.
 */
async function oxlintTree(name: LintTreeName, fix: boolean): Promise<{ ok: boolean; output: string }> {
  const tree = LINT_TREES[name];
  return run("oxlint", [...tree.targets, ...(fix ? ["--fix"] : [])], path.join(REPO_ROOT, tree.dir));
}

/**
 * `local/no-ui-glyph-in-text` for `*.i18n.json`: oxlint never parses JSON, so a dict value
 * (`"{name} · Invited {date}"`) is checked here, in the same lint run as the TSX rule.
 */
function dictGlyphs(name: LintTreeName): string[] {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === "node_modules" ? [] : walk(file);
      return entry.name.endsWith(".i18n.json") ? [file] : [];
    });
  const glyphsIn = (value: unknown, keyPath: string): string[] => {
    if (typeof value === "string") {
      const glyph = findUiGlyphInLabel(value);
      if (glyph === null) return [];
      return [
        `${keyPath}: error local(no-ui-glyph-in-text): "${value}" has \`${glyph}\`, a UI symbol typed as text. Use an icon component for a symbol; separate two values with a comma or a colon.`,
      ];
    }
    if (typeof value !== "object" || value === null) return [];
    return Object.entries(value).flatMap(([key, child]) => glyphsIn(child, `${keyPath}.${key}`));
  };
  const tree = LINT_TREES[name];
  return tree.targets
    .map(target => path.join(REPO_ROOT, tree.dir, target))
    .filter(target => existsSync(target) && statSync(target).isDirectory())
    .flatMap(walk)
    .flatMap(file => glyphsIn(JSON.parse(readFileSync(file, "utf8")), path.relative(REPO_ROOT, file)));
}

/** Cross-file, so not an oxlint rule: one entity-named component (`InvitationRow`) per name. */
function duplicateComponents(): string[] {
  return ExistingCode.forRepo()
    .duplicateComponents()
    .map(
      ({ name, places }) =>
        `${places.join(", ")}: error local(one-component-per-entity): \`${name}\` is declared in ${places.length} files. Two components with one name draw the same entity twice: reuse the existing one (a different layout is a variant or a slot on it), or name the new one after the different entity it draws.`
    );
}

/**
 * Lint every named tree: oxlint per tree (all at once), biome once over all of them.
 *
 * oxlint concurrency is deliberately UNBOUNDED: capping it at `availableParallelism()`
 * serializes the trees two at a time on a 2-core CI runner, which is slower than letting
 * the spawns overlap each other's startup and file reads.
 *
 * biome is a single invocation because it reads ONE root `biome.json`, so there is
 * nothing per-tree to resolve.
 */
async function lintTrees(names: LintTreeName[], fix: boolean): Promise<string[]> {
  const oxlintNames = names.filter(name => LINT_TREES[name].checks === "all");
  const oxlintResults = await Promise.all(
    oxlintNames.map(async name => {
      const { ok, output } = await oxlintTree(name, fix);
      const extra = [...dictGlyphs(name), ...(name === "frontend" ? duplicateComponents() : [])];
      return { name, ok: ok && extra.length === 0, output: [output.trim(), ...extra].join("\n") };
    })
  );

  const biomePaths = names.flatMap(name => treePaths(name));
  const biome = await run("biome", ["check", ...(fix ? ["--write", "--unsafe"] : []), ...biomePaths], REPO_ROOT);

  for (const { name, ok, output } of oxlintResults) {
    const trimmed = output.trim();
    if (trimmed.length > 0) console.log(`\n── ${name}${ok ? "" : "  (FAILED)"}\n${trimmed}`);
  }
  const biomeOutput = biome.output.trim();
  if (biomeOutput.length > 0) console.log(`\n── format${biome.ok ? "" : "  (FAILED)"}\n${biomeOutput}`);

  const failed: string[] = oxlintResults.filter(r => !r.ok).map(r => r.name);
  // A formatting failure names its own files, so report it under its own label.
  if (!biome.ok) failed.push("format");
  return failed;
}

/** A tree's targets as REPO-relative paths (its own `targets` are relative to its `dir`). */
function treePaths(name: LintTreeName): string[] {
  const { dir, targets } = LINT_TREES[name];
  if (dir === ".") return [...targets];
  return targets.map(target => (target === "." ? dir : `${dir}/${target}`));
}

/** Repo-relative path prefixes owned by each tree, longest first so the most specific wins. */
function treePrefixes(): { prefix: string; name: LintTreeName }[] {
  return TREE_NAMES.flatMap(name => {
    const { dir } = LINT_TREES[name];
    // Also claim the package root, so editing a tree's `.oxlintrc.json` or `package.json`
    // re-lints that tree. Skipped for `dir: "."` trees, whose root is the whole repo.
    const prefixes = dir === "." ? treePaths(name) : [...treePaths(name), dir];
    return prefixes.map(prefix => ({ prefix, name }));
  }).sort((a, b) => b.prefix.length - a.prefix.length);
}

/**
 * Which trees own the currently staged files. Derived from `LINT_TREES` rather than a
 * second hand-maintained mapping in the pre-commit hook, so adding a package cannot leave
 * the hook behind.
 */
function stagedTrees(): LintTreeName[] {
  const staged = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(line => line.length > 0);

  const prefixes = treePrefixes();
  const owners = staged.flatMap(file => {
    const match = prefixes.find(({ prefix }) => file === prefix || file.startsWith(`${prefix}/`));
    return match ? [match.name] : [];
  });
  return TREE_NAMES.filter(name => owners.includes(name));
}

/** Parse `--shard=k/n` into `{ index, total }`, or null when absent. */
function parseShard(args: string[]): { index: number; total: number } | null {
  const flag = args.find(arg => arg.startsWith("--shard="));
  if (!flag) return null;
  const match = /^--shard=(\d+)\/(\d+)$/.exec(flag);
  if (!match) {
    console.error(`Invalid ${flag} — expected --shard=<index>/<total>, e.g. --shard=1/2`);
    process.exit(1);
  }
  const index = Number(match[1]);
  const total = Number(match[2]);
  if (index < 1 || index > total) {
    console.error(`Invalid ${flag} — index must be between 1 and ${total}`);
    process.exit(1);
  }
  return { index, total };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fix = args.includes("--fix");
  const staged = args.includes("--staged");
  const shard = parseShard(args);
  const requested = args.filter(arg => !arg.startsWith("--"));

  const unknown = requested.filter(name => !(name in LINT_TREES));
  if (unknown.length > 0) {
    console.error(`Unknown lint tree(s): ${unknown.join(", ")}`);
    console.error(`Known trees: ${TREE_NAMES.join(", ")}`);
    process.exit(1);
  }

  const names = ((): LintTreeName[] => {
    if (staged) return stagedTrees();
    else if (requested.length > 0) return requested as LintTreeName[];
    else if (shard) return shardOf(shard.index, shard.total);
    else return TREE_NAMES;
  })();

  if (names.length === 0) {
    console.log(staged ? "lint: no staged files in any lint tree" : "lint: nothing to do");
    return;
  }

  const failed = await lintTrees(names, fix);
  if (failed.length > 0) {
    console.error(`\nlint failed in: ${failed.join(", ")}`);
    process.exit(1);
  }
  console.log(`\nlint clean: ${names.join(", ")}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
