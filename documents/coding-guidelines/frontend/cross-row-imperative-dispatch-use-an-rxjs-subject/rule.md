---
requires: entity-repository
---

# Cross-row imperative dispatch: use an rxjs `Subject<id>`, not DOM walking

When a parent needs to trigger an imperative action on a specific list row (focus, enter inline-edit, scroll into view, run a one-shot animation on the row's element), do NOT walk the DOM from an event handler (`e.currentTarget.closest(...)?.parentElement`). That couples the action to the current DOM nesting and silently breaks the moment the row's structure changes — no type error, no warning, just a feature that stops working.

Instead: parent owns one rxjs subject per concern. Parent fires `subject$.next(id)`. Each row subscribes with its own id and runs the action against its own ref. No prop-ref churn (`forwardRef` / `useImperativeHandle`), no top-level state change that re-renders every other row.

**Pick the subject type by mount order:**

- `Subject<string>` — default. Fire-and-forget; only currently-subscribed rows receive the value. Use this when the target row is **already mounted** at dispatch time (e.g. a flash that runs because the user clicked the row's own checkbox). Type the payload as `string`, not `string | null`, because there's no "no current target" state to model.
- `BehaviorSubject<string | null>` — only when the target row may **mount AFTER** the dispatch (e.g. an inline-edit request fired right after creating a row, where the new row arrives via realtime and needs to pick up the request on subscription). The `null` is the "nothing pending" reset; subscribers must reset to `null` after handling so the same id doesn't re-fire on the next late mount.

If you find yourself writing `subject$.next(null)` to "consume" the value with a plain `Subject`, you reached for `BehaviorSubject` when you didn't need replay — switch to `Subject` and delete the reset.

```ts
// ✅ Correct — Subject for already-mounted target rows
const flashRequest$ = useMemo(() => new Subject<string>(), []);

const ref = useRef<HTMLDivElement | null>(null);
useEffect(() => {
  const sub = flashRequest$.subscribe((targetId) => {
    if (targetId !== id || !ref.current) return;
    flashRow(ref.current);
  });
  return () => sub.unsubscribe();
}, [flashRequest$, id]);
```

```ts
// ✅ Correct — BehaviorSubject only when subscribers may mount after dispatch
const editRequest$ = useMemo(() => new BehaviorSubject<string | null>(null), []);

useEffect(() => {
  const sub = editRequest$.subscribe((targetId) => {
    if (targetId !== id) return;
    setEditing(true);
    editRequest$.next(null); // reset so a late re-subscription doesn't re-fire
  });
  return () => sub.unsubscribe();
}, [editRequest$, id]);
```

```ts
// ❌ Wrong — DOM-walk from an event handler. Breaks silently when the
// cell wrapper or row container changes shape.
onChange={(e) => {
  const row = e.currentTarget.closest("[data-no-row-click]")?.parentElement;
  if (row) flashRow(row);
}}
```

Existing examples in this codebase: `editRequest$` (BehaviorSubject) and `flashRequest$` (Subject) in `AstraOverview.tsx`, and `events$` props elsewhere for parent → child commands.