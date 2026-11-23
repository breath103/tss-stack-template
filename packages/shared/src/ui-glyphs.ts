// UI symbols typed as text: `✕ ✓ → ▾ ⋯` and friends, a ` · ` or ` • ` separator, a lone `×`,
// a leading `+ ` on a label. Shared by `local/no-ui-glyph-in-text` (TS/TSX) and the
// `*.i18n.json` walk in `scripts/lint.ts` (`dictGlyphs`).
//
// Not flagged, on purpose: typography (`… — – ’ “ ” × − °`), Hangul and other scripts, emoji,
// key caps, and the Korean interpunct inside a word (`추가·제거`).

const SYMBOL_RANGES: [number, number][] = [
  [0x2190, 0x21ff],
  [0x22ee, 0x22f1],
  [0x2300, 0x23ff],
  [0x2500, 0x25ff],
  [0x2600, 0x26ff],
  [0x2700, 0x27bf],
  [0x27f0, 0x27ff],
  [0x2900, 0x297f],
  [0x2b00, 0x2bff],
];
const KEY_CAPS = new Set("⌘⌥⌃⇧⌫⌦⏎↩↵⇥⎋");
const SEPARATORS = new Set("·•");
const EMOJI = /\p{Emoji_Presentation}/u;

/** For text that is a whole visible label (JSX text, a dict value): also a lone `×`, which as
 *  a fragment (`v.toFixed(2) + "×"`) is a multiplication sign. */
export function findUiGlyphInLabel(text: string): string | null {
  return text.trim() === "×" ? "×" : findUiGlyph(text);
}

/** The first UI symbol in `text`, or `null`. */
export function findUiGlyph(text: string): string | null {
  if (/^\+ \p{L}/u.test(text.trim())) return "+";
  const chars = Array.from(text);
  for (const [index, char] of chars.entries()) {
    if (SEPARATORS.has(char)) {
      const insideWord =
        index > 0 && index < chars.length - 1 && /\S/.test(chars[index - 1]) && /\S/.test(chars[index + 1]);
      if (!insideWord) return char;
      continue;
    }
    if (KEY_CAPS.has(char) || EMOJI.test(char)) continue;
    const code = char.codePointAt(0);
    if (code !== undefined && SYMBOL_RANGES.some(([from, to]) => code >= from && code <= to)) return char;
  }
  return null;
}
