# Use useMutation for async actions

Use the `useMutation` hook (`@/hooks/useMutation`) for async actions (API calls on button click, form submissions, etc.). Never use manual `useState` for loading/error state.

```typescript
// ✅ Correct - useMutation handles loading/error state
import { useMutation } from "@/hooks/useMutation";

const share = useMutation(async (folder: Folder) => {
  await api.fetch("/api/onedrive/memories/:id/share", "POST", { ... });
}, []);

<Button onClick={() => { void share.call(folder); }} disabled={share.status === "loading"}>
  Share
</Button>
```

```typescript
// ❌ Wrong - manual loading/error state
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleClick = async () => {
  setLoading(true);
  try { await api.fetch(...); } catch (e) { setError(e.message); } finally { setLoading(false); }
};
```
