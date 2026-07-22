# Every async user action gets visible loading state — including icon buttons

An icon-only button (trash, star, share) that fires an API call is *also* an async action. If it has no loading feedback, a laggy network renders the same icon for two seconds after the click while the request round-trips — the user re-clicks, fires a second call, data gets duplicated / double-deleted.

Wire the handler through `useMutation`, swap the icon for a Spinner while `status === "loading"`, and `disabled` the button. The standard `Button` component's `loading` prop handles labeled buttons; icon buttons need the swap inline.

```tsx
// ✅ Correct — icon swaps, button disables, click is idempotent
const remove = useMutation(async () => api.fetch("/api/memories/:id", "DELETE", { params: { id } }), [id]);

<button onClick={() => void remove.call()} disabled={remove.status === "loading"}>
  {remove.status === "loading" ? <Spinner className="size-3.5" /> : <Trash2 className="size-4" />}
</button>
```

```tsx
// ❌ Wrong — bare async handler, no loading, double-click duplicates the call
<button onClick={() => void deleteMemory(id)}>
  <Trash2 className="size-4" />
</button>
```
