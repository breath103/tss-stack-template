# Tailwind v4: register custom animations with `@theme`, not `@utility`

`@utility foo { animation: ... }` in Tailwind v4 does NOT register an animation utility reliably. The class resolves (Tailwind emits the `@utility` CSS), but the animation-name the caller references often fails to wire up to the keyframes correctly. The v4 pattern for named animation utilities is:

```css
/* ✅ Correct — @theme registers --animate-foo, Tailwind generates animate-foo */
@theme {
  --animate-breathe: breathe 1.6s ease-in-out infinite;
}
@keyframes breathe { ... }
```

Then `className="animate-breathe"` works.

```css
/* ❌ Wrong — looks like it should work, doesn't */
@utility breathe {
  animation: breathe 1.6s ease-in-out infinite;
}
@keyframes breathe { ... }
```

If you need a per-instance parameter (e.g. `animation-delay` per sibling), skip the utility entirely and inline the animation in `style`:

```tsx
// ✅ Correct — per-instance delay needs inline style anyway;
// don't introduce a utility for indirection
<span style={{ animation: `breathe 1.6s ease-in-out ${delay} infinite` }} />
```
