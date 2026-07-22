---
requires: entity-repository
---

# Delay materialization — subscribe to the narrowest slice, and only when it pays

`useObservableValue($)` materializes the **whole** record and re-renders the
component on **any** field change. That's the single biggest source of avoidable
re-renders once data flows through `$` handles: a component reads the whole
record, then either renders one field of it or just passes the value down — so a
realtime/inline edit to any field re-renders that component and everything under
it.

**The rule has two halves — when to bother, and how.**

### When it's worth subscribing narrowly (vs. a plain value read)

Reaching for `$` + a per-field subscription is an optimization with a real cost
(more components, more indirection). Spend it only where it buys something:

- **List rows** — already covered by "Choose the right list-subscription
  primitive" and "Optimize the dimension that scales": each row owns its `$` so
  adding/removing/editing one row doesn't re-render the siblings. Non-negotiable
  for the scaling dimension.
- **A record that gets edited in place** — `task.title` is editable, the detail
  panel and every cascade cell mount that task, so a title edit would re-render
  all of them. Subscribe each consumer to just the field it shows.

A plain value read (`useObservableValue($)`, or the value-returning hooks) is the
**right** choice when the record is **read-only within its mounted lifetime** —
e.g. a `comment` (there is no edit-comment feature). The materialized value never
changes, so there is no wasteful re-render to prevent; forcing `$` plumbing there
is complexity for zero gain. Don't do it.

> Decision: **Is this a list row, or a record that can change while mounted?**
> Yes → subscribe to the narrowest slice. No → read the value, keep it simple.

### How to delay materialization (when you do subscribe)

- **Render a field → `useObservableValueMap($, t => t.field, [])`.** Re-renders
  only when *that* slice changes. A leaf that renders **several** fields uses ONE
  call returning an object — `const { title, status } = useObservableValueMap($,
  t => ({ title: t.title, status: t.status }), [])`, not a call per field. The
  hook dedups at the rx level (`distinctUntilChanged` feeding a derived
  `BehaviorSubject`), so the fresh `{}` each render does **not** defeat the
  bailout — it re-emits only when one of the selected fields actually changes. If
  the leaf needs the *whole* record (a display chip showing every field, no
  editor branch), a plain `useObservableValue($)` is simpler than enumerating
  every field in a map.
- **Need it at event time only (onClick, commit, an `initialX` snapshot) →
  `$.value`.** No subscription. A `<RelationEditor initialTask={…} />` wants a
  snapshot, not a live value — pass `$task.value`.
- **Thread the `$` down, don't materialize-then-pass.** If a parent reads
  `const task = useObservableValue($)` only to pass `task` to a child, pass `$`
  instead and let the child subscribe to what it needs. The parent then
  re-renders never (or only on a presence flip — gate "not found" with
  `useObservableValueMap($, t => t !== null, [])`, which is a boolean and bails
  out on every content edit).

```tsx
// ❌ Wrong — materialize the whole task, pass the value; a title edit re-renders
// the panel and every cell under it.
const task = useObservableValue($task);
return <DetailPanel task={task} />;

// ✅ Right — thread $task; each leaf subscribes to its own field.
return <DetailPanel $task={$task} />;
function TitleField({ $task }: { $task: ObservableValue<Task> }) {
  const title = useObservableValueMap($task, (t) => t.title, []);
  // …re-renders only when the title changes.
}
```

```tsx
// ✅ Right — read-only record, just read the value. Don't over-engineer.
const comment = useObservableValue($comment); // comments aren't edited
```

```tsx
// ✅ Right — snapshot at event time, no subscription.
<RelationEditor initialTask={$otherTask.value} onCommit={…} />
onClick={() => onOpenTask($otherTask.value)}
```

Verify the win the same way as the scaling rule: a `useRenderCount` e2e where
editing `task.title` bumps only the title leaf, not the meta cells or the panel
shell.