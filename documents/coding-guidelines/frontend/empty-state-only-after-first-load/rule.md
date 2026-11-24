---
topic: Loading and empty states
order: 20
---

# When a list can be empty, show the empty state only after the first load has finished.

The failure mode this rule eliminates is the **empty-state collision**: `if (records.length === 0) return <EmptyState />` shows "No items yet" *during the initial fetch*. The user sees "No tasks yet" while the request is in flight, then the list pops in. Looks like a bug, looks like data was deleted.

| Condition | Render |
|---|---|
| `isLoading` (or `records.length === 0 && status === "fetching"`) | Skeleton mirroring the real layout (`frontend/any-surface-with-a-loading-state-shows-a`) |
| not loading AND no content | Empty state ("No items yet") |
| has content | Real content |

```tsx
// ✅ Correct — list screen: skeleton during fetch, empty state only when truly empty
if (records.length === 0 && status === "fetching") return <RowSkeletons />;
if (records.length === 0) return <EmptyState />;
return <RealList />;
```

```tsx
// ❌ Wrong — "No items yet" shows during the initial fetch
if (records.length === 0) return <EmptyState />;
return <RealList />;
```
