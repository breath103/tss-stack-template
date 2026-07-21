import { ArrowElbowDownLeft, ArrowFatUp, Backspace, CaretUp, Command, Option } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { type IconComponent } from "./icon";

// Modifier/key symbols render inconsistently as unicode text glyphs across fonts,
// so map them to fixed-box icons. Anything not in the map (Click, Enter, F2)
// stays as text.
const GLYPH_ICON: Partial<Record<string, IconComponent>> = {
  "⌘": Command,
  "⇧": ArrowFatUp,
  "⌥": Option,
  "⌃": CaretUp,
  "⌫": Backspace,
  "⏎": ArrowElbowDownLeft,
  "↩": ArrowElbowDownLeft,
};

export function ShortcutLabel({ shortcut }: { shortcut: string }) {
  const parts: ReactNode[] = [];
  let text = "";
  const flushText = () => {
    if (text) parts.push(<span key={parts.length}>{text}</span>);
    text = "";
  };
  for (const ch of shortcut) {
    const Icon = GLYPH_ICON[ch];
    if (Icon) {
      flushText();
      parts.push(<Icon key={parts.length} className="size-3" />);
    } else {
      text += ch;
    }
  }
  flushText();
  return <span className="inline-flex items-center gap-0.5 font-mono text-sm text-text-3">{parts}</span>;
}
