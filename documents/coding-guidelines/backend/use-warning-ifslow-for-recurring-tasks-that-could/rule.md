# Use `warning.ifSlow` for recurring tasks that could stall

When a task runs on a recurring interval (e.g. a cron tick every 1 minute), wrap potentially slow operations with `warning.ifSlow` to detect when they exceed expected duration. If a recurring task takes longer than its interval, it can pile up and cause cascading failures.

```typescript
// ✅ Correct — detects when a recurring operation takes too long
import { warning } from "../lib/developer-warning.js";

await warning.ifSlow("refreshUserSkills", { ms: 1000, log: () => ({ skillId }) }, async () => {
  const { data: rows } = await supabase.from("user_skills").select();
  // ... process rows
});
```

```typescript
// ❌ Wrong — no visibility into slow operations that run every minute
const { data: rows } = await supabase.from("user_skills").select();
// ... process rows
```
