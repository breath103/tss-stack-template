---
requires: entity-repository
topic: Data loading
order: 20
---

# When a component shows a persisted row, read it from the repository by id; don't pass records through props or mirror them in useState.

The component that shows an entity reads it itself. A parent never collects records into a
`byId` map and hands them down, and never mirrors a server collection in `useState<Row[]>` with
manual setters. (How rows get into the repository:
`frontend/load-and-render-persisted-data-through-the-repository`.)

- One record: `useEntity(table, { id }, loader)`.
- A list: `useRepositoryListQuery(table, key, { filter, order }, fetcher)`. A paginated list:
  `usePaginatedQuery`, which returns ids, and each row calls `useEntity`.
- A relation (the author via `user_id`): the row that needs it calls `useEntity` for that id.
  A `createEntityLoader` batches the burst into one request
  (`never-fetch-a-collection-to-resolve-one-entity`).

```tsx
// ✅ the row reads its own records
function MemberRow({ membership }: { membership: Entities["billing_account_memberships"] }) {
  const user = useEntity("users", { id: membership.user_id }).entity;
  return <Row title={user?.name ?? ""} />;
}

// ❌ a view model copied off the records, threaded through props
interface MemberVM { id: string; user_name: string; role: string }
const byId = new Map(users.map(u => [u.id, u]));
<MemberRow row={row} byId={byId} />
```

**Local UI state** (open flags, draft form values, selection) is `useState`. It never crosses
the network, so it is not an entity.
