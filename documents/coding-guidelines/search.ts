#!/usr/bin/env -S node --import tsx
/**
 * Search coding-guideline rules by keyword.
 *
 *   ./search.ts --group frontend --keywords "className, conditional"
 *   ./search.ts --keywords "supabase, select"          # all groups
 *   ./search.ts --group backend                        # list every backend rule
 *
 * Keywords are OR-matched (case-insensitive) against each rule's title + body.
 * Results are ranked by how many distinct keywords hit, then by title. Each line
 * shows the rule.md path, its title, and whether a check.sh sits beside it
 * ([check] = programmatic gate, [manual] = review by eye).
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { ruleDirs } from "./_lib";

// This script lives at the coding-guidelines root, so anchor to its own dir
// (works regardless of the caller's cwd).
const ROOT = __dirname;

function parseArgs(argv: string[]) {
  let group: string | null = null;
  const keywords: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--group") group = argv[++i] ?? null;
    else if (argv[i] === "--keywords") {
      keywords.push(
        ...(argv[++i] ?? "")
          .split(",")
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean),
      );
    }
  }
  return { group, keywords };
}

function titleOf(body: string): string {
  return /^#\s+(.+)$/m.exec(body)?.[1] ?? "(untitled)";
}

function main(): void {
  const { group, keywords } = parseArgs(process.argv.slice(2));
  const rules = ruleDirs(ROOT, group)
    .map((d) => join(d, "rule.md"))
    .filter(existsSync)
    .map((path) => {
      const text = readFileSync(path, "utf8");
      const haystack = text.toLowerCase();
      const hits = keywords.filter((k) => haystack.includes(k)).length;
      return {
        path: path.replace(`${process.cwd()}/`, ""),
        title: titleOf(text),
        hits,
        hasCheck: existsSync(join(dirname(path), "check.sh")),
      };
    });

  const matched = (keywords.length === 0 ? rules : rules.filter((r) => r.hits > 0)).sort(
    (a, b) => b.hits - a.hits || a.title.localeCompare(b.title),
  );

  if (matched.length === 0) {
    console.log(`No rules match: ${keywords.join(", ")}`);
    return;
  }
  for (const r of matched) {
    const score = keywords.length ? ` (${r.hits})` : "";
    console.log(`${r.hasCheck ? "[check] " : "[manual]"} ${r.path}${score}`);
    console.log(`         ${r.title}`);
  }
}

main();
