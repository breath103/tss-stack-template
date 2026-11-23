import { describe, expect, it } from "vitest";

import { findUiGlyph, findUiGlyphInLabel } from "./ui-glyphs";

describe("findUiGlyph", () => {
  it.each([
    ["{workspace} · Invited {date}", "·"],
    ["a • b", "•"],
    ["•", "•"],
    ["✕", "✕"],
    ["Saved ✓", "✓"],
    ["Next →", "→"],
    ["Sort ▾", "▾"],
    ["● Reply ready", "●"],
    ["⋯", "⋯"],
    ["+ New ticket", "+"],
  ])("flags %s", (text, glyph) => {
    expect(findUiGlyph(text)).toBe(glyph);
  });

  it("flags a lone × only as a whole label", () => {
    expect(findUiGlyphInLabel(" × ")).toBe("×");
    expect(findUiGlyph("×")).toBeNull();
  });

  it.each([
    "Loading…",
    "Pensieve — the backend for your agent",
    "It’s “done”",
    "멤버를 추가·제거하고 역할을 바꿉니다",
    "이미 사용 중인 URL이에요.",
    "Video × dithering shader",
    "2.00×",
    "L−1",
    "25°",
    "⌘⇧X",
    "✅ Done",
    "Create a policy first, with + on the Workspaces page.",
    "a + b",
  ])("allows %s", text => {
    expect(findUiGlyph(text)).toBeNull();
  });
});
