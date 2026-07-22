# Never accommodate `prefers-reduced-motion`

We do not support reduced motion. Do not detect it, do not branch on it, do not
disable or swap animations for it. No `@media (prefers-reduced-motion: ...)` in
CSS or CSS modules, no `matchMedia("(prefers-reduced-motion...")` in TS/TSX, no
`prefersReducedMotion` conditionals. Ship the animation unconditionally.

Adding reduced-motion fallbacks is wasted work here: it doubles the states every
animation has to be verified in, for a preference this product deliberately does
not honor. Leave it out.

✅ Just animate.

```css
.meteors {
  animation: streak 12s linear infinite;
}
```

```tsx
<g className={styles.meteors}>{/* SMIL / CSS animation, no motion query */}</g>
```

❌ Reduced-motion handling of any kind.

```css
@media (prefers-reduced-motion: reduce) {
  .meteors {
    display: none;
  }
}
```

```tsx
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
return <g className={reduce ? styles.static : styles.meteors} />;
```
