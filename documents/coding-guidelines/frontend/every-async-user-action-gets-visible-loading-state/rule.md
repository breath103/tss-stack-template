---
topic: Buttons and async actions
order: 10
---

# When a control starts async work, run it through useMutation, and show a spinner and disable the control while it runs.

Use the `useMutation` hook (`@/hooks/useMutation`) for async actions (API calls on button click, form submissions, etc.). Never use manual `useState` for loading/error state.

An icon-only button (trash, star, share) that fires an API call is *also* an async action. If it has no loading feedback, a laggy network renders the same icon for two seconds after the click while the request round-trips — the user re-clicks, fires a second call, data gets duplicated / double-deleted.

Wire the handler through `useMutation`, swap the icon for a Spinner while `status === "loading"`, and `disabled` the button. The standard `Button` component's `loading` prop handles labeled buttons; icon buttons need the swap inline.

```tsx
// ✅ Correct — icon swaps, button disables, click is idempotent
const remove = useMutation(async () => api.fetch("/api/tasks/:id", "DELETE", { params: { id } }), [id]);

<button onClick={() => void remove.call()} disabled={remove.status === "loading"}>
  {remove.status === "loading" ? <Spinner className="size-3.5" /> : <Trash2 className="size-4" />}
</button>
```

```tsx
// ✅ Correct - useMutation handles loading/error state
import { useMutation } from "@/hooks/useMutation";

const share = useMutation(async (folder: Folder) => {
  await api.fetch("/api/tasks/:id/share", "POST", { ... });
}, []);

<Button onClick={() => { void share.call(folder); }} disabled={share.status === "loading"}>
  Share
</Button>
```

```tsx
// ❌ Wrong — bare async handler, no loading, double-click duplicates the call
<button onClick={() => void deleteTask(id)}>
  <Trash2 className="size-4" />
</button>
```

```tsx
// ❌ Wrong - manual loading/error state
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleClick = async () => {
  setLoading(true);
  try { await api.fetch(...); } catch (e) { setError(e.message); } finally { setLoading(false); }
};
```
