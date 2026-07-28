---
requires: entity-repository
---

# Never fetch a collection to resolve one entity — read by id, batch the misses

A component that renders one entity resolves it in exactly two steps:

1. **Already in the repository? Use it.** No request. The row is usually already
   there — a list fetch seeded it, a realtime event pushed it, an earlier batch
   loaded it.
2. **Not there? Load THAT ID** — through a batched loader that coalesces every
   id missed in the same window into one request.

The failure this rule exists to stop is step 2 done as *"fetch the whole
collection and pick the row out of it"*:

```ts
// ❌ The anti-pattern. One missing agent → every agent in the org, per reader.
useRepositoryQuery(
  "agents",
  { id: agentId },
  async () => (await fetchAvailableAgents(orgId)).find(a => a.id === agentId) ?? null,
);
```

It looks harmless because the cache usually hides it — `useRepositoryQuery` only
calls the fetcher on a miss, so in dev, with the list already loaded, it never
fires. Then a deep link, a cold reload, or a row whose entity wasn't side-loaded
hits it, and one label costs a full collection. Put it in a list row and the cost
is a collection *per row*.

## The shape

**Backend:** every entity that gets resolved by id needs a batch read.

```ts
route("/api/orgs/:orgId/agents/by-ids", "POST", {
  body: { ids: z.array(z.uuid()) },
  handler: async ({ params, body, c }) => {
    const { orgId } = await requireOrg(c, params.orgId);
    return { agents: await agentsRepo.byIds(orgId, body.ids) };
  },
}),
```

Returning fewer rows than asked is fine — an id that no longer exists simply
stays absent from the cache and the reader renders its not-found state.

**Frontend:** one loader per table at module scope, then read through `useEntity`.

```ts
// ✅ agent-query.ts
const agentsLoader = createEntityLoader(
  "agents",
  ids => api.fetch("/api/orgs/:orgId/agents/by-ids", "POST", { params: { orgId }, body: { ids } })
           .then(r => r.agents),
  { debounceMs: 10 },   // also merges loads that land on separate ticks
);

export function useAgent(agentId: string) {
  return useEntity("agents", { id: agentId }, agentsLoader);
}
```

```tsx
// ✅ Each row declares the id it renders and resolves it itself.
function SessionRow({ session }: { session: SessionRow }) {
  const { entity: agent } = useAgent(session.agent_id);
  return <span>{agent?.name ?? "…"}</span>;
}
```

500 rows → **one** request. Rows already seeded → **zero**. And because the
reading component is the loading component, no row depends on some ancestor
having fetched its data first.

## The three cases

| Situation | What to do |
|---|---|
| Detail view for a row the list already loaded | Just read it — `useEntity(table, { id })`. It's in the cache; the loader never fires. Do NOT re-fetch it because "the detail page should own its data". |
| Detail view reachable by deep link (cache may be cold) | `useEntity(table, { id }, loader)`. Warm path costs nothing, cold path costs one batched by-id read. |
| N rows each naming a related entity (FK column) | Same `useEntity(…, loader)` in each row. The loader collapses the burst into one request — this is the case the batching exists for. |

Note the first two are the **same call**; passing the loader only changes what
happens on a miss. That's the point: you don't have to know whether the cache is
warm, and the answer never involves a collection fetch.

## Not a licence for a parent prefetch

The fix for an N+1 is the loader, **not** a parent that bulk-fetches its
children's entities before the list commits and hands them down. That reintroduces
prop-threaded records (→ `load-and-render-persisted-data-through-the-repository`
§3), couples every row to an ancestor, and breaks the moment a row is rendered
from anywhere else. Let each row ask for its own id and let the loader batch.

## Don't hand-roll the loader

`createEntityLoader` ships in `entity-repository` and is returned by
`createRepositoryContext`. It owns three behaviours that are easy to get subtly
wrong: cache-hit short-circuit, in-flight dedupe of the same id, and a batch
promise that **rejects** on failure (a version that merely resolved would tell
every waiting caller the entity had loaded — a permanently empty render with no
error, and an `unhandledRejection`). Import it; don't reimplement it per app.

## How to spot the violation

- A fetcher passed to `useRepositoryQuery` / `useEntity` that calls a `list*` /
  `fetchAll*` / `fetchAvailable*` function and then `.find(…)`.
- DevTools → Network filtered to a collection endpoint showing more than one call
  on a single page load.
- A list route whose request count grows when you add rows.

## Related rules

- `frontend/load-and-render-persisted-data-through-the-repository` — the
  canonical end-to-end data-flow rule; this one is its by-id resolution step.
- `frontend/choose-the-right-list-subscription-primitive` — which hook for lists.
- `frontend/don-t-wrap-api-fetch-with-thin-rename` — the loader's `batchFetch` is
  a real wrapper (it seeds the cache), not a rename.
