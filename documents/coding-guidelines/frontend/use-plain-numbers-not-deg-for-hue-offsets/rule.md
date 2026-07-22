# Use plain numbers (not `deg`) for hue offsets in `oklch()` relative-color syntax

In CSS's relative-color syntax `oklch(from <color> l c h)`, `h` is exposed as a `<number>` — not an `<angle>`. Adding `deg` to a hue offset reclassifies the expression as an angle, which doesn't match the expected number type; the browser treats the whole color as invalid and the element renders black / with a fallback. No warning, no error, just silently-wrong output.

```ts
// ✅ Correct — plain number, degrees implied
`oklch(from var(--primary) l c calc(h + ${i * 40}))`
```

```ts
// ❌ Wrong — `deg` invalidates the color; SVG fill falls back to black
`oklch(from var(--primary) l c calc(h + ${i * 40}deg))`
```

Same rule applies to the other relative-color numeric components: `l`, `c` in `oklch`/`oklab`, and the RGB channels in `rgb(from ...)`. They are numbers in the relative context — no units.
