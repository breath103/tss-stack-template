---
requires: entity-repository
---

# If the observable lives on a Context, consume it via Context — don't accept a prop

**Scope**: React components / hooks that need a value already exposed as a
stable observable (`BehaviorSubject`, `ObservableValue<T>`, etc.) on a
Context the consumer is mounted under.

When the controller / store / page-state is already published as an
observable on a Context (e.g. `TasksTreeContext.filters$`,
`EditorContext.selection$`), every consumer below the provider should pull
from that Context — not accept the value as a prop. The two failure modes
when consumers take a prop instead:

1. **Materialized prop (`filters: Filter`).** Whoever passes the prop must
   subscribe at their level to get the latest value, then thread the
   snapshot down through every intermediate component. Every level in
   between re-renders on every change for no reason. The deepest leaf could
   have read it from Context with zero re-render cost.
2. **Observable-ref prop (`filters$: ObservableValue<Filter>`).** Less bad —
   no churn through intermediates — but still pure noise. The Context
   already has it. Every signature, every call site, every type definition
   just re-states what the Context guarantees.

**Why**: A Context's whole purpose is "this value is in scope for everything
below me, with zero prop drilling and zero re-render of intermediates." If
you pass it as a prop you've reverted the Context's contribution and
re-introduced the costs Context was created to eliminate. The "intermediates
re-render for nothing" cost compounds with every level (page → body →
common → sections → group → provider — every one of those is a useless
render-and-pass for a value the leaf already has via `useFooContext()`).

### The smell

- A prop named `filters` / `selection` / `currentX` whose value is just
  `controls.fooSubject.value` (or `controls.foo`, a getter that returns it).
- A prop named `filters$` / `selection$` / `state$` whose value is just
  `controls.fooSubject` and the consuming tree is mounted under a Context
  that already exposes it.
- A prop with a derived "key" name (`filtersKey`, `selectionKey`) computed
  from a value the consumer can already access — and the consumer's own
  implementation re-derives it locally anyway, ignoring the prop.

### ❌ Wrong

```tsx
// Provider sits above the whole tree.
<TasksTreeProvider value={{ filters$: controls.narrowing$, /* … */ }}>
  <TaskListBody filters={controls.narrowing} filtersKey={JSON.stringify(controls.narrowing)} … />
</TasksTreeProvider>

// Each component re-passes it down.
function TaskListBody({ filters, filtersKey, … }: { filters: Filter; filtersKey: string; … }) {
  return <ProjectSections filters={filters} filtersKey={filtersKey} … />;
}
function ProjectSections({ filters, filtersKey, … }) {
  return <Dimension1Group filters={filters} filtersKey={filtersKey} … />;
}
function Dimension1Group({ filters, filtersKey, … }) {
  return useProjectTasksProvider({ filters, hostedKey, … });
}

// At the actual consumer:
function useTaskScope({ filters, … }) {
  const fetcher = useEvent(() => api.fetch(…, { filter: JSON.stringify(filters) })); // reads at call time
  const includes = useEvent((task) => passesTaskFilter(task, filters));              // reads at call time
}
```

### ✅ Right

```tsx
// Provider unchanged.
<TasksTreeProvider value={{ filters$: controls.narrowing$, /* … */ }}>
  <TaskListBody … />     {/* no filter prop at all */}
</TasksTreeProvider>

// Intermediates carry nothing filter-related.
function TaskListBody(…) { return <ProjectSections … />; }
function ProjectSections(…) { return <Dimension1Group … />; }

// Consumer pulls from Context, snapshots at call time.
function useTaskScope({ … }) {
  const { filters$ } = useTasksTree();
  const fetcher = useEvent(() => api.fetch(…, { filter: JSON.stringify(filters$.value) }));
  const includes = useEvent((task) => passesTaskFilter(task, filters$.value));
}
```

### The rule

1. Before accepting a prop, grep for whether the same value is already on a
   Context the component is mounted under. If yes, drop the prop and
   `useFooContext()` at the consumer.
2. **Never** accept an observable-ref prop (`x$: ObservableValue<T>`) when
   the same observable is already on a Context. The Context IS the way to
   share observable refs.
3. Derived "key" props (`filtersKey`, etc.) computed from a Context value
   are doubly redundant — the consumer can derive it locally if it needs
   the string at all. Especially when consumers already re-derive it and
   ignore the prop.