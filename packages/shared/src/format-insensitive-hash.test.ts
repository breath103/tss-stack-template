import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { formatInsensitiveChange } from "./format-insensitive-hash";

const fixture = (name: string) => readFileSync(path.join(import.meta.dirname, "__fixtures__", name), "utf8");

describe("formatInsensitiveChange", () => {
  const original = 'import { b } from "b";\nimport { a } from "a";\nconst x = call(a, b)\n';

  it("sees no change in what the formatter rewrites", () => {
    const formatted = "import { a } from 'a';\nimport { b } from 'b';\nconst x = call(\n  a,\n  b,\n);\n";
    expect(formatInsensitiveChange(original, formatted)).toBeNull();
  });

  // The pair is one file before and after a real `./scripts/lint.ts frontend --fix`: wrapped long
  // lines, sorted imports and Tailwind classes, quotes, semicolons, `(value) =>` to `value =>`,
  // a JSX return wrapped in parentheses, `{" "}` at a broken JSX text line, a re-broken chain.
  it("sees no change in a real lint --fix pass", () => {
    const before = fixture("lint-fix-before.tsx.txt");
    const after = fixture("lint-fix-after.tsx.txt");
    expect(formatInsensitiveChange(before, after)).toBeNull();
    expect(formatInsensitiveChange(null, after)).toEqual(formatInsensitiveChange(null, before));
  });

  it.each([
    ["a renamed identifier", original.replace("const x", "const y")],
    ["an added fallback", original.replace("call(a, b)", 'call(a, b) ?? ""')],
    ["a changed operator", original.replace("call(a, b)", "a || b")],
    ["a deleted file", null],
  ])("sees %s", (_name, edited) => {
    expect(formatInsensitiveChange(original, edited)).not.toBeNull();
  });

  it("tells two edits of one file apart", () => {
    const edit = formatInsensitiveChange(original, `${original}const y = 1;\n`);
    expect(edit?.tokens).toEqual({ const: 1, y: 1, "=": 1, "1": 1 });
    expect(edit?.signature).not.toBe(formatInsensitiveChange(original, `${original}const z = 1;\n`)?.signature);
  });

  it("gives an edit the same hash after both sides gain the same lines (main merged in)", () => {
    const edited = `${original}const mine = 1;\n`;
    const fromMain = "export const theirs = 2;\n";
    expect(formatInsensitiveChange(fromMain + original, fromMain + edited)).toEqual(
      formatInsensitiveChange(original, edited)
    );
  });
});
