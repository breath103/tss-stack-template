# Component-specific animations live in a colocated `.module.css`, not `global.css`

`global.css` is for design-system primitives (color tokens, site-wide keyframes reused by many components). A keyframe that only one component uses does not belong there — it pollutes the global namespace and makes `global.css` a catch-all dumping ground.

Put the keyframe + its wrapper class in a colocated `.module.css`. CSS modules hash both class and keyframe names, so no collision risk.

```css
/* ✅ Correct — Conversation.module.css, colocated */
@keyframes fireflyBreathe {
  0%, 100% { transform: translateY(0) scale(0.7); opacity: 0.25; }
  50%      { transform: translateY(-2px) scale(1); opacity: 1;   }
}

.breathe {
  animation: fireflyBreathe 1.6s ease-in-out infinite;
}
```

```tsx
// ✅ Consumer reads the hashed class; per-instance delay stays inline
import styles from "./Conversation.module.css";

<span className={styles.breathe} style={{ animationDelay: "200ms" }} />
```

```css
/* ❌ Wrong — one-component animation polluting global.css */
@keyframes firefly-breathe { ... }
.leaf-sway { animation: firefly-breathe ...; }
```
