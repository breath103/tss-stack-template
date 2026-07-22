# No raw `useEffect`

Never use `useEffect` directly for fire-and-forget effects that should run once per unique dependency values — use `useOnChange` (`src/hooks/useOnChange.ts`) instead. It prevents React 18 Strict Mode double-firing.

`useEffect` is acceptable **only** when you need a cleanup function (subscription teardown, event listener removal, timeout cancellation). For everything else, use `useOnChange`.

```tsx
// ✅ Correct - useOnChange for fire-and-forget
useOnChange(() => {
  void fetchData();
}, [id]);

// ✅ Correct - useEffect only when cleanup is needed
useEffect(() => {
  const sub = query$.pipe(debounceTime(250)).subscribe(setResults);
  return () => { sub.unsubscribe(); };
}, [query$]);
```

```tsx
// ❌ Wrong - raw useEffect for fire-and-forget
useEffect(() => {
  void fetchData();
}, [id]);
```
