---
topic: CSS and classNames
order: 10
---

# When a className string repeats or is long, keep it inline, or extract a small component if it is reused and means something; never store it in a constant.

A class string never moves into a JS constant (`const ITEM = "flex …"`), whatever the constant
is called: Tailwind's merger and the class linter don't see it, and it owns nothing. Do NOT
extract a class string into a `const NAME = "grid-cols-..."` and reference it from
`className={cn(..., NAME)}`. Even if the string is used at 2+ sites. Even if the string is long.

- Tailwind reads class strings by literal pattern match — every extra indirection breaks the JIT / IntelliSense affordance.
- A named constant reads as "domain concept" when it's just presentation styling. The next reader has to jump to the definition to see what it does.
- Duplication of a class string across 2 callsites is fine. Grep works. If the shape drifts, drift is a design signal — the two sites weren't the same layout to begin with.

When a string feels too long or too repeated to stay inline, the element wants one of these homes.

| Situation | Home |
|---|---|
| Short, or long but written at one call site | Inline. `cn(...)` with a few conditional groups is inline too. |
| Reused 2+ times and it means something (a menu item, a chip, a row header) | A small component that owns the element type, ARIA, handlers and styles. |
| Repeated only inside one feature | A small component in that feature, or leave the repetition. Never a global utility. |
| Variant axes, many renders per screen, or a long one-off block | `frontend/variant-or-repeated-component-classes-go-in-module-css` |
| One shape with no variants, at 3+ sites across unrelated features | `frontend/shared-class-shape-becomes-a-utility` |

## Inline

```tsx
// ❌ Wrong
// budgets/BudgetsTableView/types.ts
export const GRID_COLS = "grid-cols-[auto_1fr_auto_auto_auto_auto_auto]";

// budgets/BudgetsTableView.tsx
import { GRID_COLS } from "./BudgetsTableView/types";
<div className={cn("grid min-w-max text-sm", GRID_COLS)}>
```

```tsx
// ✅ Right
// budgets/BudgetsTableView.tsx
<div className="grid min-w-max grid-cols-[auto_1fr_auto_auto_auto_auto_auto] text-sm">

// budgets/ObjectiveDetailSidebar.tsx
<div className="grid min-w-max grid-cols-[auto_1fr_auto_auto_auto_auto_auto] text-sm">
```

## A component

```tsx
// ❌ a string constant repeated across siblings
const ITEM = "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left";
<>
  <button className={ITEM} onClick={onPick}>…</button>
  <button className={ITEM} onClick={onLink}>…</button>
</>

// ✅ MenuItem owns the styles and the contract
function MenuItem({ icon, label, onClick }: {…}) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left">
      {icon}
      {label}
    </button>
  );
}
```

## Carve-outs

- **Component-boundary props** — a shared component that takes a `className` prop for the caller to compose is fine (that's the ordinary composition seam, not a className-as-constant).
- **cva / class-variance-authority variant tables** — variant strings inside a `cva` config are the mechanism, not extracted constants.
