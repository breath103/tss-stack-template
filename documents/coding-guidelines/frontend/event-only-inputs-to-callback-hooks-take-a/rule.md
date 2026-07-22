# Event-only inputs to callback hooks: take a `getX` snapshot, not a value

When a hook is a pure window-listener / callback owner (renders nothing, just attaches a handler and acts on event), and it only needs some derived state **at event time**, take it as a `getX: () => T` **lazy snapshot** — not as a `x: T` value.

Passing a value forces the caller to subscribe to whatever drives it (state, observable, props derived from many sources) and re-render every time it changes, just to keep the handler's closure fresh via the `useEffect` dep. The hook doesn't render anything — there is no UI reason for the parent to re-render. The handler reads on demand.

With `getX`, the caller wraps a derivation closure in `useEvent` (`@/lib/use-event`) so the identity is stable. The hook's `useEffect` attaches the listener once on mount, and the handler calls `getX()` to read the latest value at fire time — no subscription, no churn.

**When to apply:**
- The hook returns `void` and its work happens inside an event/effect callback.
- The value is consulted on event, never as a render input.
- The value's freshness only matters at fire time, not earlier.

If the hook also renders something based on the value (e.g. it returns JSX, or the value drives a `useState`), pass the value normally — `getX` is only for the event-only case.

```ts
// ✅ Correct — lazy getter, listener attaches once, reads latest on event
interface NavArgs {
  getRows: () => Row[];
  selection$: BehaviorSubject<string | null>;
}
export function useRowNavigation({ getRows, selection$ }: NavArgs): void {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const rows = getRows();
      // ...
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [getRows, selection$]);
}

// Caller — stable identity, page does NOT re-render when collapsed$ flips
const getRows = useEvent(() =>
  flattenRows(filteredProjects, filteredTasks, collapsed$.value),
);
useRowNavigation({ getRows, selection$ });
```

```ts
// ❌ Wrong — pass-by-value forces the page to subscribe + re-render
// every collapse toggle just so this closure stays fresh
interface NavArgs {
  rows: Row[];
  selection$: BehaviorSubject<string | null>;
}
export function useRowNavigation({ rows, selection$ }: NavArgs): void {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // ...uses rows from closure...
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [rows, selection$]); // ← rows in deps = parent must re-render to refresh
}

// Caller — forced to subscribe just to keep the listener fresh
const collapsedIds = useSubscribedState(collapsed$, () => collapsed$.value);
const rows = useMemo(() => flattenRows(projects, tasks, collapsedIds), [projects, tasks, collapsedIds]);
useRowNavigation({ rows, selection$ });
```

The wrong shape ripples upward: the parent reaches for `useSubscribedState`, builds a `useMemo` for the value, and now re-renders on every state change — and any memo'd children that consume context from this parent re-render too if context value identity flickers. All of that is fixed by inverting one argument.

Existing examples in this codebase: `useRowNavigation` / `useRowShortcuts` in `routes/tasks/useRowShortcuts.ts` (take `getRows`); the `useEvent` helper itself lives at `lib/use-event.ts`.
