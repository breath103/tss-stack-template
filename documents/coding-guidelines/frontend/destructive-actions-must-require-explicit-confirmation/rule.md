# Destructive actions must require explicit confirmation

Any UI affordance that **deletes, archives, removes, discards, resets, or otherwise destroys user data** must route through `useModal().confirm({ variant: "destructive" })` before firing the mutation — no exceptions for "small" objects (a single comment, a single tag, a single attachment). One stray click on a trash icon should never silently nuke data. Soft-deletes that are recoverable from the UI are an exception only if the recovery is in the same screen and obvious (e.g. an undo toast you can click before it disappears).

This rule complements the "no native `window.confirm`" rule above: that rule says *how* to confirm, this rule says *when* you must.

```tsx
// ✅ Correct — comment delete with destructive confirm
async function handleDelete() {
  const ok = await confirm({
    title: i18n.confirmDeleteTitle,
    description: i18n.confirmDeleteDescription,
    confirmText: i18n.delete,
    variant: "destructive",
  });
  if (!ok) return;
  await mutations.deleteComment(comment.id);
}
```

```tsx
// ❌ Wrong — single-click destruction
<button onClick={() => mutations.deleteComment(comment.id)}>
  <Trash2 />
</button>
```

What counts as destructive:
- DELETE endpoints (`/api/comments/:id`, `/api/files/:id`, `/api/tasks/:id`, etc.)
- Bulk removes ("Clear all", "Remove selected")
- Setting a value back to empty when the prior value was non-trivial (a paragraph of description → ""; "Are you sure you want to clear this?")
- Force-unlink / detach actions that orphan dependent rows

Reviewers should reject any new delete/remove handler without a `confirm()` gate. The confirm copy lives in the component's `.i18n.json` — never inline English in the dialog.
