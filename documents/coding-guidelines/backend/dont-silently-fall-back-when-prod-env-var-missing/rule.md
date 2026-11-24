---
topic: Errors and fallbacks
order: 70
---

# When an env var may be missing, fall back only if NODE_ENV is development; in production throw.

When a runtime feature has different shapes in dev vs prod (e.g. async Lambda invoke vs in-process call, S3 vs local-disk, real provider vs in-memory stub), the dev fallback must be explicitly gated. **`if (!process.env.X) { runFallback(); return; }` is wrong** — if `X` accidentally goes missing in production (deploy bug, secret rotation gone wrong, CDK output not wired), the production Lambda silently switches to dev behavior, which usually reintroduces the exact class of bug the prod path was added to fix.

The dev fallback exists to make local iteration cheap, not to make prod resilient. In prod, missing required env is a deploy bug — fail loudly so the next request surfaces it.

```typescript
// ✅ Correct — fallback gated on dev; prod throws if env is missing
export async function invokeAsyncLambda(payload: WorkerPayload): Promise<void> {
  const functionName = process.env.WORKER_FUNCTION_NAME;
  if (!functionName) {
    if (process.env.NODE_ENV !== "development") {
      throw new Error("WORKER_FUNCTION_NAME is not set — worker invokes will not run");
    }
    void handleWorkerPayload(payload).catch((err) => console.error(err));
    return;
  }
  await lambda.send(new InvokeCommand({ FunctionName: functionName, InvocationType: "Event", ... }));
}
```

```typescript
// ❌ Wrong — prod with a missing env silently runs the dev codepath
export async function invokeAsyncLambda(payload: WorkerPayload): Promise<void> {
  const functionName = process.env.WORKER_FUNCTION_NAME;
  if (!functionName) {
    void handleWorkerPayload(payload).catch((err) => console.error(err));
    return;
  }
  await lambda.send(...);
}
```
