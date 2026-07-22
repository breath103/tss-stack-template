---
requires: entity-repository
---

# Stateful controllers: a class via a single `useMemo`, not reducer + memoized object

Same rule as "Context mutations" above, generalized: any time a hook owns
**state + several methods + derived getters** that consumers will call on
events, do NOT return a fresh object literal each render with N inline
arrow functions, and do NOT reach for `useReducer + useMemo([state, ...n
deps])` to stabilize identity. Both patterns make every dep change
recreate every closure, churn child prop refs, and bury the actual logic
under bookkeeping.

Use a class kept stable across renders via `useMemo(() => new XController(), [])`.
Hold raw state in `useState` (so React still drives re-renders), and have
the hook call `controller.update({ state, setState, …deps })` once per
render to refresh the instance's live refs. The component reads
`controller.foo` and never sees prop-ref churn.

Member conventions — follow all three:

- **Action methods are arrow class properties** (`pickDay = (day) => {…}`), never
  prototype methods. The whole point of the controller is that consumers pass these
  straight as callbacks — `onChange={controller.pickDay}`, `onClick={controller.clear}`.
  A prototype method passed as a bare reference loses `this`, so the first
  `this.d.…` access throws. Arrow properties are bound to the (stable) instance, so
  bare-callback passing is both safe and reference-stable — no wrapper closures, no
  memo churn. (If you find yourself writing `onChange={(v) => c.set(v)}`, the method
  should have been an arrow property.)
- **Derived reads are getters** (`get start()`), not arrow props — property access
  needs no binding, and a getter can't be accidentally passed as a callback.
- **Mark visibility explicitly.** Every member gets `public` or `private`. `private`
  for internal state (`d`) and internal helpers (a shared `commit`); `public` for the
  consumer API (getters + action props). The one cross-boundary method the hook calls
  to refresh refs (`update`) is `public` but tagged `/** Internal … */` so readers know
  it isn't part of the consumer surface. Group them — private state/helpers, then
  public read getters, then public action props — so the API surface reads at a glance.

```tsx
// ✅ Correct — class instance, explicit visibility, methods stable, getters read live state
class TaskRangeController {
  // private: live refs + internal helpers
  private d!: { state: State; setState: (s: State) => void; task: Task; … };
  private commit = () => { void this.d.mutations.update(...); this.d.onClose(); };

  /** Internal: the hook calls this once per render to refresh live refs. */
  public update(deps: typeof this.d) { this.d = deps; }

  // public: read surface (getters — no binding)
  public get start() { return this.d.state.start; }
  public get dirty() { return this.d.state.start?.toISOString() !== this.d.task.start_date; }

  // public: actions (arrow props — passed as bare callbacks)
  public pickDay = (day: Date) => { this.d.setState({ ...this.d.state, start: toTZ(day) }); };
  public clear = () => { this.d.setState(init(this.d.task)); };
}

export function useTaskRangeController(task, open, onClose) {
  const [state, setState] = useState<State>(() => init(task));
  const controller = useMemo(() => new TaskRangeController(), []);
  controller.update({ state, setState, task, … });
  return controller;
}
```

```tsx
// ❌ Wrong — fresh object literal + N closures per render. Every parent
// re-render churns prop refs and recreates handlers; useMemo deps balloon.
return useMemo(() => ({
  state,
  pickDay: (day: Date) => setState(...),
  setStartTime: (s: string) => setState(...),
  clearAll: () => setState(...),
  commit: () => { void mutations.update(...); onClose(); },
  dirty: ...,
  // …10+ more
}), [state, task.start_date, task.end_date, mutations, onClose, ...]);
```

When NOT to reach for the controller pattern:
- A hook returning ≤ 2 values and 0–1 callbacks. Just return a tuple/object.
- Pure derivations with no methods (no state to update). A `useMemo` returning a plain value is fine.
- Built-in primitives like `useState` / `useReducer` / `useRef` used directly inline by a small component.