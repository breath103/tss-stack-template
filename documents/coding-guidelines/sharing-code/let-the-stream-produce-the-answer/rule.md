---
topic: Code structure
order: 70
---

# When work is a stream of events, emit only what the consumer needs and let the pipe produce the answer.

A subscription, a wait-for-event, a race against a timeout: write it as one Observable whose pipe
ends in the value the caller wants. Nothing around it should exist only to carry a value from one
step to the next.

- **Emit the minimum.** If the consumer only needs "it happened", any value will do. Don't wrap it
  in `{ type: "stop" }` just so two sources share a type.
- **Map each source before merging.** Two sources merged raw give a mixed stream that every later
  step has to tell apart. Turn each one into the consumer's value first, then `merge`.
- **Finish inside the pipe.** If you `firstValueFrom(…)` and then compare the result, that
  comparison belongs in a `map` before it.
- **A source returns its own value.** A step that can fail in an expected way returns the value
  that stands for the failure (`false`, `null`). It doesn't throw a custom error for a `catch`
  outside the stream to turn back into that value.
- **Use operators, not hand-rolled machinery.** Use `timeout` instead of `new Promise` with
  `setTimeout`. Put cleanup in `finalize` or the Observable's teardown, not in a `dispose()`.
  Use `filter` with `take(1)` or `firstValueFrom` instead of a buffer, a stored resolver and
  flags. A class that only holds a subscription plus state for routing its events is a pipe
  written longhand.
- **Inline it.** A stream used once is not assigned to a variable and not annotated.

```typescript
// ✅ One subscription; any emission means stop
const stopping = new ChatControlMqttTopic({ workspaceId, chatId })
  .observe(messages => merge(messages, defer(() => chatsRepo.stopRequested(chatId)).pipe(filter(requested => requested))))
  .subscribe({
    next: () => stop.abort(),
    error: error => warning.send("chat-stop-subscribe-failed", () => ({ chatId, error: String(error) })),
  });
// finally: stopping.unsubscribe();
```

```typescript
// ❌ A class around one subscription: pending/disposed flags, an interval, a dispose()
class ChatStopWatch {
  private subscription: MqttSubscription | "pending" | "disposed" = "pending";
  private timer = setInterval(() => void this.tick(), 1_000);
  // … listen(), tick(), read(), dispose() …
}
```

```typescript
// ✅ Each source maps itself to the boolean; the merge is already the answer
return await firstValueFrom(
  topic
    .observe(reports =>
      merge(
        defer(() => this.sendResume(microvmId)).pipe(filter(sent => !sent)),
        reports.pipe(
          first(({ state }) => state === "RUNNING" || state === "TERMINATING"),
          map(({ state }) => state === "RUNNING")
        )
      )
    )
    .pipe(timeout({ first: RESUME_TIMEOUT_MS, with: () => this.terminateUnreported(microvmId) }))
);
```

```typescript
// ❌ Two sources merged before either is mapped: the pipe re-tests a `false | { state }` mix
topic.observe(refusal$).pipe(
  filter(report => report === false || report.state === "RUNNING" || report.state === "TERMINATING"),
  map(report => report !== false && report.state === "RUNNING")
);
```

```typescript
// ❌ The answer derived again after the pipe; failure routed through an exception
try {
  const { state } = await firstValueFrom(topic.observe(() => this.sendResume(id)).pipe(filter(…), timeout(ms)));
  return state === "RUNNING";
} catch (error) {
  if (error instanceof VmCannotServe) return false;
  if (error instanceof TimeoutError) { … return false; }
  throw error;
}
```
