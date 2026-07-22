# Never extract a className into a named constant

Tailwind classNames live inline in JSX. Do NOT extract a class string into a `const NAME = "grid-cols-..."` and reference it from `className={cn(..., NAME)}`. Even if the string is used at 2+ sites. Even if the string is long.

- Tailwind reads class strings by literal pattern match — every extra indirection breaks the JIT / IntelliSense affordance.
- A named constant reads as "domain concept" when it's just presentation styling. The next reader has to jump to the definition to see what it does.
- Duplication of a class string across 2 callsites is fine. Grep works. If the shape drifts, drift is a design signal — the two sites weren't the same layout to begin with.

## ❌ Wrong

```tsx
// budgets/BudgetsTableView/types.ts
export const GRID_COLS = "grid-cols-[auto_1fr_auto_auto_auto_auto_auto]";

// budgets/BudgetsTableView.tsx
import { GRID_COLS } from "./BudgetsTableView/types";
<div className={cn("grid min-w-max text-sm", GRID_COLS)}>
```

## ✅ Right

```tsx
// budgets/BudgetsTableView.tsx
<div className="grid min-w-max grid-cols-[auto_1fr_auto_auto_auto_auto_auto] text-sm">

// budgets/ObjectiveDetailSidebar.tsx
<div className="grid min-w-max grid-cols-[auto_1fr_auto_auto_auto_auto_auto] text-sm">
```

## Carve-outs

- **Component-boundary props** — a shared component that takes a `className` prop for the caller to compose is fine (that's the ordinary composition seam, not a className-as-constant).
- **cva / class-variance-authority variant tables** — variant strings inside a `cva` config are the mechanism, not extracted constants.
