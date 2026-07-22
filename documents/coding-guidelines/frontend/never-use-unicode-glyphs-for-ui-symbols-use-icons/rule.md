# Never use Unicode glyphs for UI symbols — use icon components

`✕`, `✓`, `⌃`, `▾`, `→`, etc. as literal characters in JSX are a hack: they
inherit the surrounding `font-size`, can't be tinted independently of text,
won't align to the visual baseline of nearby icons, render differently per
OS/font, and bypass the project's icon system entirely. They show up most
often on close buttons inside modals/sidebars/popovers.

Use `@phosphor-icons/react` icons (the project's icon library). The icons
render at the size you pass, share a stroke style, and accept Tailwind color
classes. They also carry a `weight` axis (`thin` / `light` / `regular` /
`bold` / `fill` / `duotone`) — use `weight="fill"` to mark a selected state
rather than reaching for a second icon.

```tsx
// ✅ Correct
import { X } from "@phosphor-icons/react";
<button type="button" aria-label="Close" onClick={onClose}>
  <X className="size-4" />
</button>
```

```tsx
// ❌ Wrong — Unicode glyph as a button label
<button type="button" onClick={onClose}>✕</button>
```

**This includes ASCII affordance glyphs baked into a `Button` label — and
labels that live in i18n dicts.** `"+ New ticket"` is a hand-drawn icon: the
`+` is the affordance, so use `content="icon-text"` / `content="icon"` with
the icon component (`Plus`, `CaretDown`, `X`, …) and keep the label pure text.
The glyph usually hides in the `.i18n.json` value, not the JSX — audit the
dict strings, not just the markup.

```tsx
// ✅ Correct — icon is an icon, label is text
<Button content="icon-text" icon={Plus} text={i18n.newTicket} />   // "New ticket"

// ❌ Wrong — affordance glyph embedded in the label string
<Button content="text" text={i18n.newTicket} />   // "+ New ticket ▾"
```

Carve-outs:

- Decorative emoji (`📍`, `🎉`, `✅` in marketing copy) where the glyph IS the
  content, not a button affordance. These render in the user's emoji font on
  purpose.
- Korean/CJK punctuation and arrows inside body copy ("→ 면접 통과") where the
  arrow is part of the sentence, not a control.

If you're putting the character in a `<button>` whose purpose is to perform
an action (close, toggle, expand, back), it's a UI symbol — use an icon.
