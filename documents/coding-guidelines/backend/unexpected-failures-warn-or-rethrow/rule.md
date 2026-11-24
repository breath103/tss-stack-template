---
topic: Errors and fallbacks
order: 20
---

# When a failure is unexpected, call warning.send if the caller can continue, otherwise rethrow; never swallow it.

Every failure is one of two kinds. Decide which before you write the `try`/`catch`.

- **Error** — something we do **not** expect to happen in production, cannot
  meaningfully recover from at runtime, and would have to *debug* if it ever
  fired (an IAM denial, a malformed internal payload, a "this can't
  happen" invariant break). You might *technically* be able to catch it, but
  there is no sensible recovery. This guide.
- **Exception** — something we **know and expect** to happen in production:
  `backend/error-vs-exception-handling`.

An error has no recovery, so the only question is whether the surrounding
procedure can carry on without the part that failed:

**If it CAN continue** (the failed step was best-effort — a realtime publish, a
runtime notify, an optional cache write) — swallow it, but make the swallow
**observable** with `warning.send` from
`packages/backend/src/lib/developer-warning.ts` (it logs *and* fires a
`developer_warning` PostHog event). A swallowed error that only prints is
invisible in production — no alert, no metric — so a *permanent* failure looks
identical to success (exactly how the prod agent chat returned 200 with no reply
while every VM boot was being IAM-denied and `.catch(console.error)`'d).

Use a `try`/`catch` block, **not** a promise `.catch()` callback — the handling
is scoped and explicit, and it reads identically for sync and async code.

```ts
// ✅ best-effort: request must still succeed, but the failure must be visible
import { warning } from "../../lib/developer-warning.js";

try {
  await agentRuntimeDriver.notify({ sessionId });
} catch (err) {
  warning.send("agent-session-notify-failed", () => ({
    sessionId,
    error: err instanceof Error ? err.message : String(err),
  }));
}
```

**If it CANNOT continue** (the parent relies on the errored step — its result
feeds the rest of the procedure) — don't half-handle it. Just `throw` (or don't
catch at all), so the side effects stay consistent: the whole operation fails as
a unit instead of limping on with a hole in its state. The global
`app.onError` handler already `warning.send`s and returns a 500.

```ts
// ✅ can't continue without it → let it throw; onError logs + 500s
const creds = await assumeMqttRole(userId); // throws on sts:AssumeRole denial
await post(handle);                            // never reached with a bad handle
```

## `console.error` is banned in `packages/backend/src`

There is no third option. Swallow → `warning.send`. Can't recover → `throw`. A
bare `console.error` is a swallow with no metric — the worst of both. The only
file allowed to call it is `developer-warning.ts` itself (the one real log
line). Lint enforces this.

```ts
// ❌ the failure vanishes: no metric fires, a permanent failure reads as success
try {
  await agentRuntimeDriver.notify({ sessionId });
} catch (err) {
  console.error("[agent-sessions] notify failed:", err);
}
```
