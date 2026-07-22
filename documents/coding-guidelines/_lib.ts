import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";

// The optional add-ons this project opted into (`tss.json` `uses`), read by
// walking up from the guidelines root. Mirrors packages/shared/src/uses.ts —
// duplicated (not imported) because this runs as a standalone tsx script far
// from the shared package.
function projectUses(startDir: string): Set<string> {
  let dir = startDir;
  const { root } = parse(dir);
  for (;;) {
    const manifest = join(dir, "tss.json");
    if (existsSync(manifest)) {
      try {
        const parsed = JSON.parse(readFileSync(manifest, "utf8")) as { uses?: string[] };
        return new Set(parsed.uses ?? []);
      } catch {
        return new Set();
      }
    }
    if (dir === root) return new Set();
    dir = dirname(dir);
  }
}

// The add-ons a rule requires, from its rule.md frontmatter `requires:` (scalar
// or list). No frontmatter, or no `requires`, means a baseline rule.
export function requiresOf(ruleDir: string): string[] {
  const path = join(ruleDir, "rule.md");
  if (!existsSync(path)) return [];
  const fm = /^---\n([\s\S]*?)\n---/.exec(readFileSync(path, "utf8"));
  if (!fm) return [];
  const line = /^requires:\s*(.+)$/m.exec(fm[1]);
  if (!line) return [];
  return line[1]
    .replace(/^\[|\]$/g, "")
    .split(",")
    .map(s => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

/**
 * List every rule directory under the coding-guidelines root.
 * `root` is the guidelines dir; pass a `group` to scope to one group, or null
 * for all groups. Returns absolute paths to each `<group>/<slug>` folder.
 *
 * Rules whose `requires:` add-ons aren't all in the project's `tss.json` `uses`
 * are omitted — an add-on rule for an add-on this project doesn't use is dead.
 * Pass `all: true` to list every rule regardless (authoring / audit).
 */
export function ruleDirs(root: string, group: string | null, opts: { all?: boolean } = {}): string[] {
  const uses = opts.all ? null : projectUses(root);
  const groups = group
    ? [group]
    : readdirSync(root, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
  return groups.flatMap(g => {
    const dir = join(root, g);
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => join(dir, d.name))
      .filter(ruleDir => uses === null || requiresOf(ruleDir).every(r => uses.has(r)));
  });
}
