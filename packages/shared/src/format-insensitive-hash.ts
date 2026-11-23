import { createHash } from "node:crypto";

// Formatter-proof change detection. `lint --fix` (biome + oxlint fixes) rewraps lines, sorts
// imports and Tailwind classes, swaps quotes, commas, semicolons and parentheses, and writes
// `{" "}` where it breaks a JSX text line. So a file is compared as a bag of tokens with those
// dropped: any added, removed or renamed word or operator shows, a reformat does not.
const JSX_SPACE = /\{\s*(["'])\s+\1\s*\}/g;
const TOKEN = /[\w$]+|[^\s\w$,;()"'`]/g;

function tokenCounts(content: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of content.replace(JSX_SPACE, "").match(TOKEN) ?? [])
    counts.set(token, (counts.get(token) ?? 0) + 1);
  return counts;
}

/**
 * What changed between two versions of a file: `tokens` gained (positive) and lost (negative),
 * and a `signature` hash of them. `null` when the versions differ only in formatting. `null`
 * content = the file does not exist on that side. The same edit gives the same result on top
 * of any other change made to both versions alike.
 */
export function formatInsensitiveChange(
  before: string | null,
  after: string | null
): { signature: string; tokens: Record<string, number> } | null {
  const delta = tokenCounts(after ?? "");
  for (const [token, count] of tokenCounts(before ?? "")) delta.set(token, (delta.get(token) ?? 0) - count);
  const changed = [...delta].filter(([, count]) => count !== 0).sort(([a], [b]) => (a < b ? -1 : 1));
  const existence = [before === null ? "absent" : "present", after === null ? "absent" : "present"].join(" to ");
  if (changed.length === 0 && (before === null) === (after === null)) return null;
  const signature = createHash("sha256")
    .update(`${existence}\n${changed.map(([token, count]) => `${token} ${count}`).join("\n")}`)
    .digest("hex");
  return { signature, tokens: Object.fromEntries(changed) };
}
