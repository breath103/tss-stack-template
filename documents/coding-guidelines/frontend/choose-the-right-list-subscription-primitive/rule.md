---
requires: entity-repository
---

# Choose the right list-subscription primitive

The repository exposes four ways to consume a list of entities. Picking the wrong one is the single largest cause of "every row re-renders on every edit" in this codebase.

**The decision rule is one question:** *Does the consumer iterate the list to render one component per record?*

- **Yes →** `useRepositoryObservableListQuery` (with fetcher) or `useObservableList` (cache populated elsewhere). Hand each row its own `$` / record; the row owns its content subscription.
- **No →** `useRepositoryListQuery` (with fetcher) or `snapshotList` (event-time read). The consumer is a single derivation (`find`, `length`, dropdown of trivial `<option>`s) and the `Entity[]` shape is simpler.

The render-cost gap is structural: `useRepositoryListQuery` re-emits on **every per-record event matching the filter** (insert/delete AND every field edit on a matching row). `useRepositoryObservableListQuery` runs the id-array through `distinctUntilChanged` so the caller only re-renders on **id-set / order change** — per-row edits stay invisible at the parent and only re-render the row that owns the changed `$`.

| Hook | Fetcher | Returns | Re-emits on | Use when |
|---|---|---|---|---|
| `useRepositoryObservableListQuery(table, key, options, fetcher?)` (`@/lib/observable-record-list`) | optional | `{ records: Array<{id, $}>, status }` | id-set / order change ONLY | Rendering a row-per-record list. Hand `$` down to each row and let it subscribe to itself. |
| `useRepositoryListQuery(table, key, options, fetcher)` (entity-repository, re-exported from `RepositoryContext`) | required | `{ records: Entity[], status }` | EVERY matching per-record event | Consumer reads the array in a single op (derivation, `<option>` dropdown, count). NOT for row-rendered lists. |
| `useObservableList(table, key, options)` (raw entity-repository) | none | `Entity[]` | EVERY matching per-record event | Same as `useRepositoryListQuery` but when the cache is populated by a sibling fetch. Derivation only, never row rendering. |
| `snapshotList(table, options)` (`@/lib/observable-record-list`) | none | `Entity[]` | Never — single synchronous read | Reading the full array at event time only (export click, drop-target priority math, filter recompute). No subscription, no re-render. |

**The default for any list that drives row rendering is `useRepositoryObservableListQuery`.** The `useRepositoryListQuery` / `useObservableList` array shape is convenient for single-op reads, wrong for the rendering hot path because the subscriber re-renders on every per-record edit, even when only one row's content changed.

If you're tempted to call `useRepositoryListQuery` or `useObservableList` and then map the result into row components inside JSX, that's the smell — switch to `useRepositoryObservableListQuery` and let each row mount its own subscription.

```ts
// ✅ Row rendering — useRepositoryObservableListQuery + per-row $task subscription
const works = useRepositoryObservableListQuery<"tasks">("tasks", `works:${project.id}`, {
  filter: (t) => t.project_id === project.id && t.task_depth === 1,
});
return works.records.map(({ id, $ }) => <TaskBranch key={id} $task={$} />);
// Editing one task: only that TaskRow re-renders. The parent component
// receives the same id-set, distinctUntilChanged bails out.
```

```ts
// ✅ Single-op read — useRepositoryListQuery for a Select dropdown
const usersQuery = useRepositoryListQuery("users", "all", usersListOptions, () => api.fetch("/api/users", "GET"));
return (
  <Select>
    {usersQuery.records.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
  </Select>
);
// Re-renders on any user edit, but the consumer's render is a tiny <option> list — fixed cost.
```

```ts
// ✅ Event-time read — snapshotList, no subscription
function onDownloadExcel() {
  exportTasksToExcel({
    tasks: snapshotList("tasks", tasksListOptions),
    // ...
  });
}
```

```ts
// ✅ Derivation-only, cache pre-populated — useObservableList
const users = useObservableList("users", "all", usersListOptions);
const me = users.find((u) => u.id === meId);
const workState = me?.work_state ?? "idle";
// Re-renders on user events, but that's a single component reading a
// single derived value — not 500 rows propagating.
```

```ts
// ❌ Wrong — useRepositoryListQuery drives a 500-row table
const tasks = useRepositoryListQuery("tasks", "all", tasksListOptions, fetchTasks);
return (
  <div className="grid">
    {tasks.records.map((t) => <TaskRow key={t.id} task={t} />)}
  </div>
);
// Editing one task re-emits a new array → page re-renders → every
// TaskRow re-renders (memo busts on the new `task` prop reference).
```

Sites that legitimately keep `useRepositoryListQuery` / `useObservableList` in this codebase: `AdminProjectsPage` and `AdminUsersPage`'s users/orgs-for-Select dropdowns; `useTasksPageData`'s tasks-list count read; `WorkStateControl` (find-by-id for `me`); `WorkStatePage` (`makeOrgLookup` derivation + small team-size tables). Everything else that lists 50+ rows or is per-row-rendered is `useRepositoryObservableListQuery`.