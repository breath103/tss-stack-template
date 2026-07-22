import { existsSync, readFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";

// The optional add-ons this project opted into, read from the nearest `tss.json`
// (`uses` array) walking up from `startDir`. A coding guideline or oxlint rule
// tagged `requires: <add-on>` is enforced only when the add-on is listed here;
// the baseline stack carries no tag and is always enforced.
export function projectUses(startDir: string = process.cwd()): Set<string> {
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

// Whether every add-on in `requires` is enabled. Empty `requires` (baseline
// rule) is always satisfied.
export function isEnabled(requires: string | string[] | undefined, uses: Set<string>): boolean {
  if (!requires) return true;
  const list = Array.isArray(requires) ? requires : [requires];
  return list.every(r => uses.has(r));
}
