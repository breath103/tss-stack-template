---
requires: entity-repository
---

# Load and render persisted data through the repository — never a bespoke response model

This is the one canonical rule for the whole path a DB row travels from
Postgres to a rendered pixel. Every other data-flow guideline (subscription
primitives, optimistic writes, backend record shapes) is a detail *of* this
flow and is cross-linked at the bottom. If you are fetching something the DB
persists and putting it on screen, this is the rule.

**The contract, end to end:**

```
Postgres row  ──►  backend returns the TABLE shape (Task, Comment, …)
              ──►  frontend ingests the response into the repository (repository.multiSet)
              ──►  each component reads its OWN record by id from the repository
                   (useObservableTask / useObservableEntity / useObservableEntities)
              ──►  writes go back through useRepositoryWriter (optimistic)
```

Break any link and you get the failure this rule exists to stop: a flattened
`{ work_title, task_title, rank, snippet }` shape invented in the RPC or
rebuilt on the frontend, records threaded down through props, `useState<X[]>`
duplicating the cache, or a god-hook fanning every fetch across the page.

---

## 1. The wire shape IS the table shape. Do not invent a response model.

An endpoint that returns rows which ARE records returns those records. No
denormalization, no flattening, no `rank`/`snippet`/`work_title` columns
welded on. The generated type must be the table `Row` type.

- Backend: `RETURNS SETOF tasks`, `select("*")`, return the supabase rows
  directly — never a hand-written `interface` or a `RETURNS TABLE(...)`
  projection. (→ `backend/dont-decompose-a-record-into-a-derived-row-type`,
  `backend/return-supabase-rows-directly-no-mapping-functions`,
  `backend/use-database-row-types-no-manual-interfaces`.)
- Frontend: import the row type from `@backend/types/database` and render
  from it. Do **not** define a parallel `SearchHit` / `RowVM` that copies
  fields off the record.

**A new API-response model that is not a persisted table shape is a
violation unless it is genuinely unavoidable** (see carve-outs). "It was
convenient to flatten for the UI" is not unavoidable — the UI derives its
view (crumbs, snippet, label) from the real record at render time.

## 2. Ingest the response into the repository — don't hold it in local state.

When entity rows come back from any fetch, push them into the repository
(`repository.multiSet(table, rows)` / `repository.set`). That is what makes
them readable — by id, live, deduped — from every other component. Related
rows the response side-loads to save round-trips (parent works, a comment's
host task) get ingested too, so a consumer resolves them by id with **zero**
extra fetches.

Never mirror a server collection in `useState<X[]>` + manual setters — the
repository already owns ordering, dedup, single-record lookup, and event
fan-out.

## 3. Render from the repository, by id — never thread records through props.

The component that shows an entity reads it itself, by id, through the
observable helpers, and subscribes to just the field(s) it paints. A parent
never collects records into a `byId` map and hands them down.

- One record: `useObservableTask(id)` / `useObservableEntity(table, id, loader)`
  → `useObservableValue` / `useObservableValueMap` for the field(s) shown.
- A row-rendered list: `useObservableEntities` / `useRepositoryObservableListQuery`
  — hand each row its own `$` so one edit re-renders one row.
- Resolve a relation (parent work via `root_task_id`, author via `user_id`)
  by calling the loader for *that id* in the row that needs it. The loader
  batches the burst into one request and returns cached ids for free — so
  the reading component is the loading component. No parent bulk-fetch, no
  `useFooPageData` god-hook threading a data-bag into every subtree.

## 4. Write back through the repository writer.

Edits to a loaded row go through `useRepositoryWriter` (optimistic: patch
cache first, roll back on failure) — never `await api…; repository.set()`.
(→ `frontend/optimistic-local-writes-go-through-userepositorywriter-never-await`.)

---

## Worked example — the global ⌘K search (the exact fuck-up this prevents)

### ✅ Right

```ts
// backend/supabase/migrations — the hit rows ARE tasks/comments.
CREATE FUNCTION search_tasks(...) RETURNS SETOF tasks ...   -- real Task rows
CREATE FUNCTION search_comments(..., p_viewer_id text) RETURNS SETOF comments ...

// backend/src/routes/search.ts — returns real records + the related rows
// a hit references (parent works, comment host tasks), nothing flattened.
return { tasks, comments, relatedTasks };   // Task[] , Comment[] , Task[]
```

```ts
// frontend/useGlobalSearch.ts — ingest the response into the repository.
from(api.fetch("/api/search", "GET", { query: { q } })).pipe(
  tap((res) => {
    repository.multiSet("tasks", [...res.tasks, ...res.relatedTasks]);
    repository.multiSet("comments", res.comments);
  }),
  // The hook exposes only ids (grouped) — a one-shot projection, not records.
  map((res) => toGroups(res)),
);
```

```tsx
// frontend/SearchPalette.tsx — each row reads its own record by id and
// resolves its parent work by id, straight from the (already primed) repo.
function TaskRow({ taskId, kind }: { taskId: string; kind: "work" | "task" }) {
  const task = useObservableValueMap(useObservableTask(taskId).$, (t) => t, []);
  const workId = task && task.parent_id !== null ? task.root_task_id : null;
  const work = useObservableValueMap(useObservableTask(workId)?.$ ?? null, (w) => w, []);
  // …render [work.title › task.title] from the REAL records…
}
```

### ❌ Wrong

```ts
// The RPC flattens records into a bespoke row…
CREATE FUNCTION search(...) RETURNS TABLE(project_id text, task_id text,
  work_title text, task_title text, rank real, snippet text) ...

// …or the frontend rebuilds that same decomposed shape as a view model…
interface SearchHit {
  work_id: string; work_title: string;      // ← denormalized copies of a Task
  task_id: string; task_title: string;      //   that already exists as a record
  snippet: string;
}
function deriveHits(res): SearchHit[] { /* copy fields off the records */ }

// …and threads a byId map down through props instead of reading from the repo.
const byId = new Map([...tasks, ...relatedTasks].map((t) => [t.id, t]));
<SearchRow row={row} byId={byId} />;   // parent-collected records, no subscription
```

Both ❌ forms lose the real entity, can't dedupe against the cache, don't go
live on edits, and force every downstream consumer to speak a made-up
vocabulary. The ✅ form has exactly one source of truth: the repository.

---

## Carve-outs — when a non-table response shape IS allowed

- **Genuine aggregates** that are not any single record: `countBy`
  dimension → `{ key, count }[]`, a rollup, a histogram. There is no table
  row to return, so a computed shape is correct.
- **An envelope of real records** is fine — and encouraged. `{ tasks,
  comments, relatedTasks }`, `{ comments, mentions }` each field is a real
  `Row[]`; the envelope just groups several ingests from one request. That is
  NOT a bespoke model — every leaf is a table shape you `multiSet`.
- **Pure local UI state** (open flags, draft form values, hover/selection
  subjects) is `useState` — it never crosses the network, so it is not an
  entity.

If you think you need a new response model, first prove it is one of these.
"Flatten a record for convenience" is never one of these.

---

## Related rules (the details of this flow)

- `frontend/choose-the-right-list-subscription-primitive` — which list hook
  (`useRepositoryObservableListQuery` vs `useRepositoryListQuery` vs
  `snapshotList`) for row-rendering vs single-op reads.
- `frontend/optimistic-local-writes-go-through-userepositorywriter-never-await`
- `frontend/delay-materialization-subscribe-to-the-narrowest-slice-and`
- `frontend/expose-observablevalue-not-snapshot-getters`,
  `frontend/hooks-reading-at-call-time-take-observable-references`,
  `frontend/observables-on-context-consume-via-context-not-props` — the
  observable-plumbing conventions.
- `frontend/use-apiclient-for-api-calls`,
  `frontend/don-t-wrap-api-fetch-with-thin-rename`,
  `frontend/import-backend-types-directly` — the fetch + typing boundary.
- backend: `dont-decompose-a-record-into-a-derived-row-type`,
  `return-supabase-rows-directly-no-mapping-functions`,
  `use-database-row-types-no-manual-interfaces`,
  `never-force-cast-api-client-responses`.