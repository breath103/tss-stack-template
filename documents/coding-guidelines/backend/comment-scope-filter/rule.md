# Every API surface that emits Comment rows must gate on `isCommentVisibleTo`

`comments.scope` is `null` (public) for almost every row, but when it's `{type:"private", users:[…]}` the comment must NOT be returned to any HTTP caller outside `scope.users` (plus the writer). The internal repositories — `commentsRepository.listByTask`, `listByIds`, `getById`, and the inbox service helpers — intentionally return unfiltered rows; the visibility check is a **route-layer responsibility**, applied at the last step before serialisation.

One helper in `packages/backend/src/lib/comment-scope.ts`:

```ts
isCommentVisibleTo(c, userId): boolean  // c.scope === null || c.writer === userId || c.scope.users.includes(userId)
```

For lists / mentions: inline the filter — `.filter(c => isCommentVisibleTo(c, user.id))` and `mentions.filter(m => visibleIds.has(m.comment_id))`. The helper isn't a framework; it's a one-liner you compose with array methods at the callsite.

```ts
// ✅ Correct — route filters the list, then drops orphan mentions
route("/api/tasks/:id/comments", "GET", {
  handler: async ({ c, params }) => {
    const user = c.get("requireUser")();
    const [allComments, allMentions] = await Promise.all([
      commentsRepository.listByTask(params.id),
      commentMentionsRepository.listByTask(params.id),
    ]);
    const comments = allComments.filter((c) => isCommentVisibleTo(c, user.id));
    const visible = new Set(comments.map((c) => c.id));
    const mentions = allMentions.filter((m) => visible.has(m.comment_id));
    return { comments, mentions };
  },
});
```

```ts
// ✅ Correct — single-row read gates before serving
const comment = await commentsRepository.getById(params.id);
if (!comment) throw new HTTPException(404, ...);
if (!isCommentVisibleTo(comment, user.id)) throw new HTTPException(404, ...);
return comment;
```

```ts
// ❌ Wrong — repository row leaves the route without a visibility check
const comments = await commentsRepository.listByTask(params.id);
return { comments };
```

## Rules

- The check runs **at the HTTP boundary**, not inside the repository. Internal callers (notifications, history snapshots, the writing service) need unfiltered rows.
- Both filters are required when comments and mentions ship together: a mention whose `comment_id` references a now-hidden comment still reveals the comment exists.
- Single-row routes (mutation routes that return a row, `GET /api/comments/:id`) gate with `isCommentVisibleTo` and surface a 404 when the caller can't see it. **404, not 403** — the existence of the row is itself sensitive.
- Routes that intentionally serve unfiltered rows (admin / audit / migration) must include a `// scope: <reason>` comment justifying the opt-out so `check.sh` is satisfied.

## Programmatic gate

`check.sh` (sibling) greps every route file that touches `commentsRepository` / `commentInboxService` / `commentMentionsRepository.listByTask` and fails if neither `isCommentVisibleTo` nor a `// scope:` opt-out appears in the file. Best-effort static check; the human reviewer is the backstop.
