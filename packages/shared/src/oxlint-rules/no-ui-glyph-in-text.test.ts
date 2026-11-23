import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noUiGlyphInText from "./no-ui-glyph-in-text.js";

RuleTester.describe = describe;
RuleTester.it = it;

const errors = [{ messageId: "uiGlyph" }];

new RuleTester().run("no-ui-glyph-in-text", noUiGlyphInText, {
  valid: [
    { code: 'const x = <Button content="icon" icon={XIcon} aria-label={i18n.close} />;', filename: "t.tsx" },
    { code: "const x = <p>Loading… it’s — fine</p>;", filename: "t.tsx" },
    { code: 'const x = "멤버를 추가·제거";', filename: "t.ts" },
    { code: 'const KEYS = { "⌘": Command, "⇧": ArrowFatUp };', filename: "t.ts" },
    { code: 'const x = v.toFixed(2) + "×";', filename: "t.ts" },
    { code: "// a → b in a comment\nconst x = 1;", filename: "t.ts" },
    { code: "const shader = `void main() {\n  // sky → ground\n}`;", filename: "t.ts" },
    { code: 'const x = <span className="flex gap-2"><span>{a}</span><span>{b}</span></span>;', filename: "t.tsx" },
  ],
  invalid: [
    { code: "const x = <button onClick={onClose}>✕</button>;", filename: "t.tsx", errors },
    { code: "const x = <span>{a} · {b}</span>;", filename: "t.tsx", errors },
    { code: 'const x = parts.join(" · ");', filename: "t.ts", errors },
    { code: "const x = `${a} · ${b}`;", filename: "t.ts", errors },
    { code: 'const x = <Button text="Next →" />;', filename: "t.tsx", errors },
    { code: 'const x = { label: "+ New ticket" };', filename: "t.ts", errors },
    { code: "const x = <span>×</span>;", filename: "t.tsx", errors },
  ],
});
