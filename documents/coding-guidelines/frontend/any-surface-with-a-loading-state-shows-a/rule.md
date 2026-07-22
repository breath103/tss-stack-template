# Any surface with a loading state shows a skeleton, never a spinner

**Universal rule, no exceptions:** any screen, dialog, sidebar, panel, detail view, or list whose content is loading must render a **skeleton that mirrors the real layout** while the data is in flight. Centered `<Spinner />` in the content area is a bug — it doesn't reserve layout space, doesn't communicate what's coming, and the page jumps when real content arrives. The only places a bare spinner is acceptable are *inside* a button's loading state and full-page auth/route boundaries where the layout itself isn't known yet.

Two failure modes this rule eliminates:

1. **Spinner-then-pop**: `if (isLoading) return <Spinner />` followed by a totally different DOM tree on resolve. Width/height of the resolved tree is unknown until it arrives → layout shift.
2. **Empty-state collision**: `if (records.length === 0) return <EmptyState />` shows "No items yet" *during the initial fetch*. The user sees "No memories yet" while the request is in flight, then the list pops in. Looks like a bug, looks like data was deleted.

Every loading-aware surface must distinguish three states cleanly:

| Condition | Render |
|---|---|
| `isLoading` (or `records.length === 0 && status === "fetching"`) | Skeleton mirroring the real layout |
| not loading AND no content | Empty state ("No items yet") |
| has content | Real content + (if `hasMore`) sentinel + spinner |

```tsx
// ✅ Correct — list screen: skeleton during fetch, empty state only when truly empty
if (records.length === 0 && status === "fetching") return <RowSkeletons />;
if (records.length === 0) return <EmptyState />;
return <RealList />;

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

// ❌ Wrong — "No items yet" shows during the initial fetch
if (records.length === 0) return <EmptyState />;
return <RealList />;
```

The skeleton should mirror the real layout's column widths, row count, and chrome (borders, padding). Don't substitute "Loading…" text. If a surface gets a new piece of dynamic content, the skeleton component gets updated alongside it — they ship as a pair.
