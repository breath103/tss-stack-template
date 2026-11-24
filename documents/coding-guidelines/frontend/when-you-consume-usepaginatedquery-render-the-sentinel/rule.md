---
requires: entity-repository
topic: Loading and empty states
order: 70
---

# When you render a usePaginatedQuery list, render its sentinel, drive the skeleton from its loading flag, and keep the server's order.

`usePaginatedQuery(table, fetchPage, scroller)` returns `{ ids, loading, sentinel }`. Dropping `sentinel` on the floor is a silent bug — the list renders the first page, looks complete, and stops there. No error, no warning, no console message; just a list that quietly caps at the page size, and hardest of all to spot in dev where seed data is smaller than one page.

Every consumer must:

1. Render one row per id, each reading its own record with `useEntity`. The hook returns **ids in the server's order** on purpose: sorting them again on the client sorts a partial set, and materializing the records here would hand the list a new array on every per-record event.
2. Attach `sentinel` to an element after the last row. It self-disables once there is no next page, so it needs no `hasMore` guard around it.
3. Read `loading` twice — with `ids.length === 0` for the initial skeleton, and on its own for the next-page indicator.
4. Memoize `fetchPage` over everything the query depends on (parent id, sort, filter). **Its identity IS the query's identity**: paging restarts when it changes, because a cursor is only meaningful against the order that issued it. An unmemoized closure refetches page one forever.

```tsx
// ✅ Correct
const { ids, loading, sentinel } = usePaginatedQuery(
  "table_records",
  useCallback(async cursor => await fetchTableRecords({ tableId, orderBy: sort, cursor }), [tableId, sort]),
  scroller
);

if (ids.length === 0 && loading) return <RowSkeletons />;
return (
  <>
    {ids.map(id => (
      <Row key={id} recordId={id} />
    ))}
    <div ref={sentinel} className="h-px" />
    {loading && <RowSkeletons rows={3} />}
  </>
);
```

```tsx
// ❌ Wrong — only the first page ever loads; no skeleton, and a fresh closure every render
const { ids } = usePaginatedQuery("table_records", cursor => fetchTableRecords({ tableId, cursor }));
return <>{ids.map(...)}</>;
```

If you genuinely only need a bounded set, use `useRepositoryListQuery` instead — `usePaginatedQuery` with an unrendered sentinel is a code smell that the wrong hook was picked.
