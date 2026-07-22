# Multi-branch render: inline IIFE with `if`/`else if` — never nested ternaries

When a render position chooses between **three or more** mutually-exclusive outputs (loading / error / empty / content; or a discriminated-union of view modes), do NOT chain ternaries. A nested `a ? x : b ? y : c ? z : w` is unreadable, mis-indents the moment one branch grows, and hides which conditions are exhaustive.

Render it with an immediately-invoked arrow that uses plain `if`/`else if`/`else` and `return`s each branch. Each condition reads on its own line, branches are easy to reorder, and adding a state is one more `else if` — not a re-nest of the whole chain.

```tsx
// ✅ Correct — inline IIFE, one branch per condition, reads top-to-bottom
<div className="flex min-h-0 flex-1 flex-col">
  {(() => {
    if (items.length === 0 && status === "fetching") {
      return <Skeleton className="min-h-0 flex-1 rounded-lg" />;
    } else if (status === "error") {
      return <p className="text-error">{i18n.error}</p>;
    } else if (items.length === 0) {
      return <p className="text-text-3">{i18n.empty}</p>;
    } else if (lens === "gantt") {
      return <GanttView … />;
    } else {
      return <TreeView … />;
    }
  })()}
</div>
```

```tsx
// ❌ Wrong — nested ternary; every new state re-indents the whole pyramid
{items.length === 0 && status === "fetching"
  ? <Skeleton … />
  : status === "error"
    ? <p>{i18n.error}</p>
    : items.length === 0
      ? <p>{i18n.empty}</p>
      : lens === "gantt"
        ? <GanttView … />
        : <TreeView … />}
```

A **single** ternary (`cond ? <A/> : <B/>`) is fine — that's two branches, no nesting. The rule kicks in at the *third* branch. Don't reach for a separate `FooBody` component just to host the branching either — the IIFE keeps the branches next to the props they close over (`status`, `lens`, the handlers) without inventing a prop-passing surface. Extract a component when a branch's *content* is independently large/reusable, not merely to escape a ternary.
