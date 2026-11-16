# Date every legacy-format shim with an expiring TODO

Code that keeps an **old, non-persistent format** working always says when it
stops. Examples are an old URL param shape, a retired request/response payload,
a stale localStorage/cache layout, or a redirect from a renamed route. Mark every
such block with:

```ts
// TODO: [yyyy/mm/dd] delete this code
```

On that date, `local/expired-todo` (oxlint, `"error"`) fails lint. Whoever touches
the repo next has to delete the shim. Without a date, compat code lives forever:
nobody remembers why it's there or whether anything still sends the old shape.

- **Applies to:** formats that age out by themselves, such as shared links,
  bookmarks, in-flight clients and caches. Data persisted in the DB is migrated
  instead (a migration or `migrate-*.ts` script), not shimmed.
- **Picking the date:** long enough for the old format to stop arriving.
  Weeks for URLs and caches. Longer if external callers (another service, an
  agent) have to switch first. Tell those callers the date.
- **Placement:** put the TODO on every block that exists only for the old
  format, so deleting the marked code removes the whole shim. The rule only
  checks dates; it can't see unmarked shims.
- **Format:** exactly `TODO: [yyyy/mm/dd]`. Other dates inside `TODO: [...]`
  are flagged as malformed, because a TODO that never expires defeats the point.

## ✅ Correct

```ts
export const itemsRoute = createRoute({
  // TODO: [2026/12/01] delete this code
  beforeLoad: ({ location, search }) => {
    if ("filter" in location.search) throw redirect({ to: "/items", search, replace: true });
  },
});
```

## ❌ Wrong

```ts
// Legacy ?filter=<JSON> links — keep for backwards compatibility.
beforeLoad: ({ location, search }) => { … }
```

There's no date, so this never gets deleted.

```ts
// TODO: remove after the migration settles
```

"Settles" isn't a date, and lint can't enforce it.
