---
topic: Loading and empty states
order: 10
---

# When data is still loading, show a skeleton; never a spinner.

**Universal rule, no exceptions:** any screen, dialog, sidebar, panel, detail view, or list whose content is loading must render a **skeleton that mirrors the real layout** while the data is in flight. Centered `<Spinner />` in the content area is a bug — it doesn't reserve layout space, doesn't communicate what's coming, and the page jumps when real content arrives. The only places a bare spinner is acceptable are *inside* a button's loading state and full-page auth/route boundaries where the layout itself isn't known yet.

The failure mode this rule eliminates is **spinner-then-pop**: `if (isLoading) return <Spinner />` followed by a totally different DOM tree on resolve. Width/height of the resolved tree is unknown until it arrives → layout shift.

Every loading-aware surface must distinguish three states cleanly:

| Condition | Render |
|---|---|
| `isLoading` (or `records.length === 0 && status === "fetching"`) | Skeleton mirroring the real layout |
| not loading AND no content | Empty state ("No items yet"): `frontend/empty-state-only-after-first-load` |
| has content | Real content + (if `hasMore`) sentinel + spinner |

```tsx
// ✅ Correct — dialog body
if (state.isLoading) return <TaskGroupSectionsSkeleton />;
if (state.tasks.length === 0) return <EmptyMessage />;
return <RealContent />;

// ✅ Correct — detail panel
if (memory === null && status === "fetching") return <MemoryDetailSkeleton />;
if (memory === null) return <NotFound />;
return <MemoryDetail memory={memory} />;
```

```tsx
// ❌ Wrong — bare spinner in content area
if (state.isLoading) {
  return <div className="flex items-center justify-center"><Spinner /></div>;
}
```

Don't substitute "Loading…" text. How the skeleton is built — the loaded component rendered without data, not a separate mirror kept in sync by hand — is `a-skeleton-is-the-loaded-component-rendered-without-data`.
