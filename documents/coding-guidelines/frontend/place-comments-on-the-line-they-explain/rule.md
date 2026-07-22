# Place comments on the line they explain

When a comment explains a specific line — an rxjs operator, a hook arg, one
clause of an expression — put it **directly above (or beside) that line**, NOT
in a top-of-function block that catalogs each line of the body.

A top-of-function block listing "what each line does" makes the reader scan back
and forth between the catalog and the code to match them up. The line is
already there; comment it where it lives.

The companion rule `comment-non-obvious-code` decides *whether* to comment. This
rule decides *where*.

```ts
// ✅ Right — one short comment per non-obvious line, where it sits.
const sub = combineLatest([view$, userFilter$]).pipe(
  // Active tab uses the live userFilter; siblings use their preset.
  map(([active, uf]) => entries.map(({ id, preset }) => id === active ? uf : preset)),
  // setView emits view$ AND userFilter$ in the same tick — coalesce the burst.
  debounceTime(0),
  distinctUntilChanged(eqArr),
  // Cancels the previous in-flight POST so a stale response can't overwrite.
  switchMap((filters) => from(api.fetch("/api/tasks/counts", "POST", { body: { filters } }))),
).subscribe(setCounts);
```

```ts
// ❌ Wrong — top-of-function block describing each line of the body.
// Pipeline shape matters here:
//   - `debounceTime(0)` coalesces the burst that a single tab click produces.
//     setView emits view$ AND triggers a userFilter$ write in the same tick…
//   - `distinctUntilChanged` skips re-fetches for payloads we already fetched.
//   - `switchMap` cancels the previous in-flight POST when a new payload
//     arrives. Without this a stale response could land after the fresh one…
function useTabCounts(...) {
  const sub = combineLatest([view$, userFilter$]).pipe(
    map(...),
    debounceTime(0),
    distinctUntilChanged(eqArr),
    switchMap(...),
  ).subscribe(setCounts);
}
```

## Carve-outs

- A short header explaining the function's **purpose** (1–3 lines, not per-line)
  is fine on top — it answers "what does this function do," not "what does line
  N do."
- JSDoc on exported APIs is fine — that's a contract, not a body catalog.
- Block comments are appropriate when the explanation spans multiple lines that
  share one rationale (e.g. a 5-line workaround for one browser bug). The test
  is "does this comment map 1:1 onto one line?" — if yes, put it there.
