# Never raw `<input>` / `<textarea>` — use the in-house `Input`

Every text field — single-line or multi-line, with or without autoresize — goes through `Input` from `@/components/ui/Input`. Don't hand-roll `<input className="..." />` or `<textarea className="..." />`, even "just this one." The primitive owns the focus ring, the placeholder color, the disabled / aria-invalid look, the autoresize sizing math (`minLine` / `maxLine`), and the keyboard handling. Every hand-rolled callsite diverges from the primitive in at least one of those — usually the focus ring and the dark-mode placeholder — and the bug is invisible until someone notices in design QA.

`Input` already exposes `onBlur`, `onKeyDown`, and `onMount` (for `focus + select` patterns) on its base props. If something you need isn't on the primitive, add it there — don't fork.

```tsx
// ✅ Correct — single-line
<Input value={title} onChange={setTitle} placeholder="Title" />

// ✅ Correct — multi-line, autoresize
<Input
  autoresize
  minLine={6}
  maxLine={16}
  value={draft}
  onChange={setDraft}
  onBlur={commit}
  placeholder="Add a description…"
/>

// ✅ Correct — inline-edit handler wired via Input's props
<Input
  value={draft}
  onChange={setDraft}
  onBlur={commit}
  onMount={(el) => { el.focus(); if (el instanceof HTMLInputElement) el.select(); }}
  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
/>
```

```tsx
// ❌ Wrong — raw textarea, hand-rolled chrome that drifts from the primitive
<textarea
  className="w-full resize-y rounded-md bg-surface-2/40 px-3 py-2 text-sm outline-none placeholder:text-text-3"
  value={draft}
  onChange={(e) => setDraft(e.target.value)}
/>

// ❌ Wrong — raw input with custom focus ring that doesn't match Input
<input
  type="text"
  className="block w-full rounded-sm border px-2 py-1 text-xl outline-none focus:border-accent-1"
  value={draft}
  onChange={(e) => setDraft(e.target.value)}
/>
```

The `<input type="time">` narrow exception in the date-picker rule below also applies here — bare HH:MM next to a Calendar is fine. Everything else goes through `Input`.
