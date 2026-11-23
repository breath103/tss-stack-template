---
topic: Buttons and async actions
order: 40
---

# When an action deletes, clears or detaches user data, await useConfirm() with variant "destructive" before running it.

Any control that deletes, removes, discards, resets or detaches user data awaits `useConfirm()`
(`@/contexts/ModalContext`) with `variant: "destructive"` before the mutation fires. There is no
exception for small objects (one message, one tag, one attachment): a stray click on a trash
icon must never destroy data. A soft delete is exempt only when the undo is on the same screen
and obvious.

```tsx
// ✅ Correct
const confirm = useConfirm();
const remove = async () => {
  const ok = await confirm({
    title: i18n.removeTitle.replace("{name}", name),
    description: i18n.removeBody,
    confirmText: i18n.remove,
    variant: "destructive",
  });
  if (ok) mutations.removeMember(membership);
};
```

```tsx
// ❌ Wrong — single-click destruction
<Button icon={Trash} onClick={() => mutations.removeMember(membership)} />
```

What counts as destructive:
- Anything that ends in a DELETE endpoint.
- Bulk removes ("Clear all", "Remove selected").
- Emptying a non-trivial value (a paragraph of description set back to nothing).
- Unlink / detach actions that orphan dependent rows.

The confirm copy lives in the component's `.i18n.json`, never inline in the call.
