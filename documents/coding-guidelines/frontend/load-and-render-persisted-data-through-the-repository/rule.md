---
requires: entity-repository
topic: Data loading
order: 10
---

# When an endpoint returns persisted rows, return them table-shaped and ingest them into the repository; don't invent a response model.

The path a DB row travels from Postgres to the screen:

```
Postgres row  ──►  backend returns the TABLE shape (Selectable<Database[table]>)
              ──►  frontend ingests the response into the repository (repository.multiSet / set)
              ──►  each component reads its OWN record by id (useEntity)
              ──►  writes go back through the shared repositoryWriter (optimistic)
```

Break one of the first two links and you get what this rule exists to stop: a flattened
`{ chat_title, workspace_name, rank, snippet }` shape invented on the backend or rebuilt on the
frontend, or one hook fanning every fetch across the page. The last two links are
`frontend/read-persisted-rows-from-the-repository-by-id` and
`frontend/write-persisted-rows-through-repositorywriter`.

## 1. The wire shape is the table shape

An endpoint that returns rows which ARE records returns those records. No denormalization, no
flattening, no `rank` / `snippet` / `workspace_name` columns welded on.

- Backend: return what the repository returned. No hand-written `interface`, no mapper.
- Frontend: import the row type from `@backend/types/database` and render from it. Do not
  define a parallel `SearchHit` / `RowVM` that copies fields off the record.
- A table whose raw row must not reach the browser (ciphertext, OAuth tokens) ships a named
  projection registered in `Entities` in `RepositoryContext.tsx` (`keychain_items`,
  `user_accounts`). That is the only reason to diverge from the row.

The UI derives its view (a crumb, a label, a snippet) from the real record at render time.

## 2. Ingest the response; don't hold it in local state

Rows that come back from any fetch go into the repository (`repository.multiSet(table, rows)` /
`repository.set`). That makes them readable by id, live and deduped, from every component.
Related rows the response side-loads (a member's `users` row) are ingested too, so a consumer
resolves them by id with no extra fetch.

## When a non-table response shape is allowed

- **An aggregate** that is no single record: a count per key, a rollup, a histogram.
- **An envelope of real records**: `{ memberships, users }`. Each field is a `Row[]` you
  `multiSet`; the envelope groups several ingests from one request.

"Flatten a record for convenience" is none of these.
