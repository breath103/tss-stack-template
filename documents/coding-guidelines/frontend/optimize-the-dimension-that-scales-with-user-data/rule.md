---
requires: entity-repository
---

# Optimize the dimension that scales with user data

**Scope:** Any view backed by an entity-repository collection that users can edit in realtime.

The optimization budget tracks the dimension that the user can scale up — not the dimensions that are fixed at design time. A `/tasks` page has 6 cells per row (fixed by the schema) but an unbounded number of rows (the user creates them). 1000 tasks × 6 cells = 6000 elements; cutting per-cell renders is a constant-factor win, but if the WHOLE LIST re-renders on every per-task edit, the cost scales O(N) with user activity. **Optimize the scaling dimension first; the fixed dimensions are a nice-to-have.**

How to tell which dimension scales:
- "Can the user add more of these?" Tasks: yes. Cells in a task row: no. Comments under a post: yes. Fields in a user-settings form: no.
- The scaling dimension MUST use per-instance subscription via `useRepositoryObservableListQuery` + per-`$` children. Anything less means O(N) rendering on every realtime edit.
- Fixed dimensions can ride the parent's render — memo is fine to have but not load-bearing.

### The non-negotiable: per-instance subscription on the scaling dimension

Use `useRepositoryObservableListQuery` for the scaling dimension; hand each child its own `$`; the child owns its subscription. See "Choose the right list-subscription primitive" above for the hook itself — this rule is about what each row component does with the `$` it receives.

`useObservableValue($)` re-emits on EVERY field change. If you call it at the row level, the whole row re-renders on every edit to that one row, and every child receives a new prop reference. That alone is usually fine (one row's worth of work) — but it cascades into deeper trees if you pass the resolved record down.

**For event-time reads (onClick / onContextMenu / drag handlers / commit callbacks), use `$.value` directly.** No subscription needed — the handler closure captures the stable `$` ref and reads the latest snapshot at fire time. Calling `useObservableValue` just to feed an event handler is pure waste.

**For render-time reads of a single field, prefer `useObservableValueMap($, x => slice, deps)`** — it re-renders only when the *mapped* result changes (`Object.is` bailout). Use `useObservableValue($)` only when render output genuinely depends on the whole record.

### Examples

❌ Wrong — list-level subscription on a scaling dimension:

```tsx
const tasks = useObservableList("tasks", "all", options);  // re-emits on every task event
return tasks.map((t) => <TaskRow key={t.id} task={t} />);
// 1000 tasks. Editing one → array re-emits → 1000 rows re-render.
```

❌ Wrong — `useObservableValue` just to feed event handlers:

```tsx
const task = useObservableValue($task);  // subscribed just to read .id in a closure
return (
  <div
    onClick={() => onOpenTask(task)}
    onContextMenu={(e) => openTaskContextMenu(e, task, hasChildren)}
  >…</div>
);
```

✅ Right — per-instance `$`, event-time `.value`:

```tsx
const works = useRepositoryObservableListQuery<"tasks">("tasks", `works:${projectId}`, options);
return works.records.map(({ id, $ }) => <TaskRow key={id} $task={$} />);
// 1000 tasks. Editing one → only that TaskRow re-renders.

const TaskRow = memo(function TaskRow({ $task }: { $task: ObservableValue<Task> }) {
  // No useObservableValue — read .value at event time, slice via map.
  return (
    <div
      onClick={() => onOpenTask($task.value)}
      onContextMenu={(e) => openTaskContextMenu(e, $task.value, hasChildren)}
    >…</div>
  );
});
```

### After the scaling dimension is handled: per-child memo (nice-to-have)

Once the row-level subscription is correct, the next question is whether the row's children (its cells, sub-components) re-render in sync. For a fixed-width row (6 cells, never grows), the cost of re-rendering all 6 on every emit is bounded — fine to defer.

When it IS worth it: cells with expensive renders (rich text editors, charts, calendars), or when profiling shows the cascade is meaningfully on the critical path. The fix is the same shape as the row-level fix: take primitive props in the cell, `memo()` it, and have the parent read each slice via `useObservableValueMap` so the cell's prop is `Object.is`-equal whenever its slice didn't change.

```tsx
// Cells take primitive props, not the whole task.
const StatusCell = memo(function StatusCell({ taskId, status, canWrite }: Props) {…});
const PersonCell = memo(function PersonCell({ taskId, value, field, users, canWrite }: Props) {…});

const TaskRow = memo(function TaskRow({ $task }) {
  const id = $task.value.id;
  const status = useObservableValueMap($task, (t) => t.status, []);
  const svId = useObservableValueMap($task, (t) => t.sv_id, []);
  return (
    <>
      <StatusCell taskId={id} status={status} canWrite={canWrite} />
      <PersonCell taskId={id} value={svId} field="sv_id" users={users} canWrite={canWrite} />
    </>
  );
});
```

**Stability checklist for memo'd children:**
- All props are primitives OR reference-stable handles (`$task`, an array from a list-subscription, etc.).
- Callback props are `useCallback`-stable or come from `useEvent`. A fresh closure per parent render busts memo.
- The parent reads each slice via `useObservableValueMap` so prop references stay `Object.is`-equal when the slice didn't change.

### Verifying

Every list whose row count scales with user data needs an e2e test using `useRenderCount` (from `@/dev/useRenderCount`):

- **Required:** editing one row does NOT bump the parent list/page's render count (proves the scaling-dimension fix held).
- **Nice-to-have:** editing field A on one row bumps only the cell rendering field A (proves per-cell memo if you added it).

See `e2e/tasks-no-rerender-on-edit.ts` for the template.