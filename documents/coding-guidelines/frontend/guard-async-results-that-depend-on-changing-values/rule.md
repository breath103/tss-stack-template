# Guard async results that depend on changing values

Any network request whose result depends on a value that can change while the
component stays mounted must prevent stale results from committing after a newer
value has been requested. Prefer making the changing value an observable stream
and using `switchMap` / subscription cleanup so the old async work is
unsubscribed instead of hand-rolling request ids.

```tsx
// ✅ Correct — changing filters drive one subscription; stale emissions are dropped.
useEffect(() => {
  const sub = filters$.pipe(
    switchMap((filters) => from(api.fetch("/api/tasks/countBy", "POST", { body: { filters } }))),
  ).subscribe(setCounts);
  return () => sub.unsubscribe();
}, [filters$]);
```

```tsx
// ❌ Wrong — each change starts a promise that can resolve later and overwrite
// the result for the current filter.
useOnChange(() => {
  void api.fetch("/api/tasks/countBy", "POST", { body: { filters } }).then(setCounts);
}, [filtersKey]);
```

If the request cannot be expressed as an observable pipeline, the cleanup must
still make stale completion harmless. The important invariant is that only the
latest value for this mounted component can update UI state.
