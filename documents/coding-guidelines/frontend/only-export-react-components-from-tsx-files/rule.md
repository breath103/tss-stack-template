# Only export React components from `.tsx` files

Every export from a `.tsx` file must be a React component (or a type). Exporting non-component values (cva variants, constants, utility functions) breaks Vite's React Fast Refresh — the entire file is invalidated on every change, cascading to all importers.

If you need to export a non-component value, move it to a separate `.ts` file.

```typescript
// ✅ Correct — only component exported from .tsx
// Button.tsx
export function Button({ ... }: ButtonProps) { ... }
```

```typescript
// ❌ Wrong — non-component export breaks Fast Refresh
// Button.tsx
export function Button({ ... }: ButtonProps) { ... }
export { buttonVariants };  // ← breaks Fast Refresh for this file
```
