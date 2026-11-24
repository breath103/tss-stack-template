---
topic: Loading and empty states
order: 80
---

# When you build a list screen, put the newest item on top and load older pages downward; only comment threads run oldest-first.

Every list screen shows the newest item at the top and the user scrolls **down** to load older
pages. The server owns the order: the endpoint returns rows newest-first with a keyset cursor,
and the next page is strictly older than the last row loaded.

```tsx
// ✅ ids arrive in the server's order; the sentinel sits at the bottom of the list
const { ids, loading, sentinel } = usePaginatedQuery(
  "users",
  useCallback(async (cursor: string | null) => await fetchAdminUsers({ q, cursor }), [q])
);
```

`usePaginatedQuery`'s `upsert` puts a row it has not seen at the front, which is where a
just-created row belongs on a newest-first list.

**Exception: comment threads.** Comments render chronologically (oldest top, newest bottom)
because a reply has to come after what it answers. Older pages load at the top, and the
load-more sentinel sits at the top of the scroll container.

If you want newest-at-bottom for a list that is not a conversation, stop and ask. The convention
is shared so the user's mental model carries between screens.
