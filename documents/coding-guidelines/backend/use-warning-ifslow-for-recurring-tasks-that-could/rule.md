---
topic: Errors and fallbacks
order: 90
---

# When work runs on a recurring tick, wrap it in warning.ifSlow.

When a task runs on a recurring interval (e.g. a cron tick every 1 minute), wrap potentially slow operations with `warning.ifSlow` to detect when they exceed expected duration. If a recurring task takes longer than its interval, it can pile up and cause cascading failures.

```typescript
// ✅ Correct — detects when a recurring operation takes too long
import { warning } from "../lib/developer-warning.js";

await warning.ifSlow("refreshTaskReminders", { ms: 1000, log: () => ({ projectId }) }, async () => {
  const rows = await db.get().selectFrom("tasks").selectAll().execute();
  // ... process rows
});
```

```typescript
// ❌ Wrong — no visibility into slow operations that run every minute
const rows = await db.get().selectFrom("tasks").selectAll().execute();
// ... process rows
```
