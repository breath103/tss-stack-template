---
requires: entity-repository
---

# Hooks that read state at CALL time take an observable reference, not a value

**Scope**: Custom hooks where the returned functions / callbacks read some
piece of state **when they fire**, not at render time — e.g. mutation hooks
(`useTaskMutations`), event handlers, fetchers, drag handlers, anything
wrapped in `useEvent` / `useCallback` that closes over external state.

If a hook's only use of `someState` is inside `useEvent(...)` / a returned
callback, accepting `someState: Value` is wrong. Two problems:

1. **The hook's parent must re-render to re-create the hook with the latest
   value.** A `useTaskMutations({ filters })` called from a component that
   doesn't subscribe to `filters` bakes the stale snapshot into the closure
   forever. The hook silently uses whatever was passed at mount.
2. **Every component above the hook that holds the snapshot re-renders on
   every change**, just so the hook can be re-created with the right value
   — and the hook itself doesn't even need it at render time.

The fix is to accept the observable reference (`filters$: ObservableValue<Filter>`)
and read `.value` inside the callback. The reference is stable for the
controller's lifetime; the callback always sees the latest value; nothing
above the hook needs to subscribe.

**Why**: `useEvent` exists precisely to give you a stable function whose body
reads the latest values without subscribing. Combining `useEvent` with a
value prop defeats `useEvent`'s purpose — you're back to "the function
captures whatever was passed at render time." Observable + `.value` at call
time is the actual stable pattern.

### The smell

- A hook takes `x: Foo` and uses `x` ONLY inside `useEvent(...)` / a returned
  callback. No render-time use, no dependency in any `useMemo` / `useEffect`
  dep array, never branched on at render.
- Callers compute `x` from a `BehaviorSubject` (`controls.narrowing` is a
  getter for `controls.narrowing$.value`) and pass the snapshot.
- The hook's "you must re-render the parent on every change" contract isn't
  documented anywhere — and re-rendering the parent buys nothing because
  the hook re-creation just re-baked the same closure.

### ❌ Wrong

```tsx
// hook
function useTaskMutations({ filters, confirm }: { filters: Filter; confirm: Confirm }) {
  const create = useEvent(async (input) => {
    const defaults = computeDefaults(filters);    // closure captures the snapshot
    await api.fetch("/api/tasks", "POST", { body: { ...input, ...defaults } });
  });
  return { create };
}

// caller
function Page() {
  const filters = useObservableValue(controls.narrowing$);  // subscribes the WHOLE page
  const mutations = useTaskMutations({ filters, confirm }); // re-creates the hook every filter edit
  // … 200 lines of JSX re-render on every filter keystroke
}
```

### ✅ Right

```tsx
// hook
function useTaskMutations({ filters$, confirm }: { filters$: ObservableValue<Filter>; confirm: Confirm }) {
  const create = useEvent(async (input) => {
    const defaults = computeDefaults(filters$.value);   // read at call time
    await api.fetch("/api/tasks", "POST", { body: { ...input, ...defaults } });
  });
  return { create };
}

// caller
function Page() {
  const mutations = useTaskMutations({ filters$: controls.narrowing$, confirm });
  // page does NOT re-render on filter edits — the controller's subject is stable;
  // mutations are stable; the hook reads .value when create() actually fires.
}
```

For callers that genuinely don't have a live observable (e.g. a sidebar
that has no scope), expose a module-level singleton subject:

```ts
export const EMPTY_FILTERS$: ObservableValue<Filter> = new BehaviorSubject<Filter>([]);
```

Pass it. Don't make the prop optional — that pushes nullable handling into
every callback.

### The rule

1. At every hook's prop signature, ask: does the hook read this **at
   render** or **inside a callback**? Render-only → take the value.
   Callback-only → take the observable reference, read `.value` at call
   time.
2. Mixed (some render, some callback) → take the observable; subscribe at
   the leaf component that needs the render-time slice via
   `useObservableValueMap`. The hook's callbacks still read `.value`.
3. Callers without a live observable use a module-level singleton subject —
   don't make the prop optional.