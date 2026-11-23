// Flags a UI symbol typed as text in a string literal, template or JSX text: `✕ ✓ → ▾ ⋯`, a
// ` · ` separator, a lone `×`, a leading `+ `. The set is `findUiGlyph` in `../ui-glyphs.ts`;
// `*.i18n.json` values get the same check from `dictGlyphs` in `scripts/lint.ts`.
//
// A string with a line break is skipped: those are embedded programs (a GLSL shader, SQL), and
// their comments use arrows.

import { findUiGlyph, findUiGlyphInLabel } from "../ui-glyphs.ts";
import type { Context } from "./plugin-api.ts";

interface Node {
  type: string;
  value?: unknown;
}

const rule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow UI symbols typed as text" },
    messages: {
      uiGlyph:
        "`{{glyph}}` is a UI symbol typed as text. A symbol is a Phosphor icon component (`icon={XIcon}`, `<CaretDownIcon />`). Two values are separated by a comma or colon inside one string, or by `gap-*` between two elements, never by a dot.",
    },
    schema: [],
  },
  create(context: Context) {
    const report = (node: Node, glyph: string | null) => {
      if (glyph !== null) context.report({ node, messageId: "uiGlyph", data: { glyph } });
    };
    const check = (node: Node, text: unknown) => {
      if (typeof text === "string" && !text.includes("\n")) report(node, findUiGlyph(text));
    };
    return {
      Literal(node: Node) {
        check(node, node.value);
      },
      JSXText(node: Node) {
        if (typeof node.value === "string") report(node, findUiGlyphInLabel(node.value));
      },
      TemplateElement(node: Node) {
        const value = node.value;
        if (typeof value === "object" && value !== null && "cooked" in value) check(node, value.cooked);
      },
    };
  },
};

export default rule;
