---
topic: Buttons and async actions
order: 70
---

# When state must reset as an async action finishes, reset it inside the useMutation body so both changes commit together.

When a control's appearance depends on **two** pieces of state, both must change in
the same React commit. If they land in separate commits, the frame in between is
rendered — and because interactive elements carry `transition-all`, that frame is
*animated*, so a one-frame logic slip becomes a visible blink.

The trap is that `useMutation` (and any hook that owns async status) sets its own
status **before returning**, so a caller's follow-up `setState` runs in a *later*
microtask and React commits twice:

```
call() resolves → useMutation setState(success)  → sending = false, text still present
                                                 → disabled = false   ← rendered, and transitioned
caller's `await` resumes → setText("")           → empty = true
                                                 → disabled = true    ← snaps back
```

**Fix: do the second update inside the mutation body**, where it batches with the
mutation's own success update.

```tsx
// ✅ Correct — the clear happens inside the body, so it batches with setState(success)
const send = useMutation(
  async (value: string) => {
    await mutations.sendText(orgId, sessionId, value);
    setText("");
  },
  [orgId, sessionId, mutations]
);
const barred = send.status === "loading" || text.trim() === "";
<Button loading={send.status === "loading"} disabled={barred} />
```

```tsx
// ❌ Wrong — two commits: the button flashes enabled between them
const submit = async () => {
  if ((await onSend(text.trim())) !== null) setText("");   // lands a microtask late
};
<Button loading={sending} disabled={sending || text.trim() === ""} />
```

This is also why the mutation belongs **next to** the state it settles. Hoisting the
mutation to a parent and passing `sending` down guarantees the split, because the
parent's status and the child's local state can no longer be updated together.

## How to spot it

Any control whose `disabled` / `loading` / `visible` is an expression over two
sources, where one source is an async hook's status and the other is local state the
same async action resets. Ask: *is there an instant where one has flipped and the
other hasn't, and what does the control look like then?*

## Don't "fix" it by lifting state to force batching

Moving the draft into the parent so both updates happen there also batches — and
re-renders every sibling on each keystroke. Keep the state local and move the
*mutation* to it, not the reverse.
