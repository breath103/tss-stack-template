# List screens: newest on top, older paginates toward the bottom

Default mental model for every list screen (memories, chats, etc.): the *newest* item is at the top of the screen, older items below it, and the user scrolls **down** to load older pages. Cursor is `before=<created_at>` (or `updated_at`) of the oldest item currently loaded; the next fetch returns items strictly older than that.

Sort: `(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()` (descending). Pass to `usePaginatedQuery` with no `direction` (defaults to `"forward"` which appends pages toward the bottom).

**Exception: chat conversations.** Messages render chronologically (oldest top, newest bottom) because reading order matters — assistant replies have to come *after* the questions they answer. Use `direction: "backward"` so older pages prepend at the top, and put the load-more sentinel at the *top* of the scroll container, not the bottom.

```tsx
// ✅ Correct — list screen, newest first, older below
const { records } = usePaginatedQuery("memories", undefined, fetcher, {
  sort: (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
});
```

```tsx
// ✅ Correct — chat messages, chronological with backward pagination
const { records } = usePaginatedQuery("chat_messages", chatId, fetcher, {
  sort: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  direction: "backward",
});
```

If you find yourself wanting newest-at-bottom for a *list* screen (not a conversation), stop and ask. The convention is shared so the user's mental model carries between screens.
