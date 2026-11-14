# Coordinate concurrency with RxJS, not hand-kept flags

When async work can overlap — the same request fired again before the last one
finished, events arriving while a reload is in flight, a newer value superseding
an older request, bursts that should collapse into one call — express it as an
RxJS pipeline. Do not coordinate it with module-level promises, `isLoading`
latches, request ids, "fetched at" timestamps or per-request start times.

Each of those flags is a hand-written, untested copy of an operator that already
exists, and each one is another piece of state that has to be reset on every
path (success, error, unmount, StrictMode remount) or it silently wedges.

Pick the operator by what should happen to work that arrives while earlier work
is still running:

| While busy, a new trigger should… | Operator |
|---|---|
| be ignored; the running one covers it | `exhaustMap` |
| cancel the running one; latest wins | `switchMap` |
| wait its turn | `concatMap` |
| run alongside, capped | `mergeMap(fn, n)` |
| collapse with others in a burst | `debounceTime` / `throttleTime` / `auditTime` |

Triggers come from a `Subject` (or an existing observable); the subscription
lives in a `useEffect` whose cleanup unsubscribes.

```ts
// ✅ Correct — stale signals drive one pipeline; exhaustMap drops signals
// that arrive while a reload is in flight.
export const sessionStale$ = new Subject<void>();

useEffect(() => {
  const sub = sessionStale$
    .pipe(exhaustMap(() => authClient.getSession()))
    .subscribe(({ data }) => setSession(data));
  return () => sub.unsubscribe();
}, []);
```

```ts
// ❌ Wrong — an in-flight promise, a timestamp and a per-request start time,
// all reimplementing exhaustMap by hand.
let sessionFetch: Promise<void> | null = null;
let sessionFetchedAt = Number.NEGATIVE_INFINITY;

function reloadSession() {
  sessionFetch ??= authClient.getSession().then(/* … */).finally(() => {
    sessionFetch = null;
  });
}

setOnSessionStale(requestStartedAt => {
  if (requestStartedAt > sessionFetchedAt) reloadSession();
});
```

**The exception is genuinely trivial cases**: one request, fired once, whose
result can't be superseded (a mount-time load guarded by `useOnChange`), or a
single `if (busy) return` on a button that also shows its loading state. The
moment a second flag, a timestamp, an id comparison, or a "was this started
before that finished?" question appears, it is no longer trivial — use RxJS.

See also `guard-async-results-that-depend-on-changing-values` for the
`switchMap` (latest-wins) case.
