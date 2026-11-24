---
topic: Errors and fallbacks
order: 10
---

# When a failure is expected (bad input, missing row, upstream refusal), catch it by type and throw a typed ApiError at the route.

Every failure is one of two kinds. Decide which before you write the `try`/`catch`.

- **Exception** — something we **know and expect** to happen in production
  (record not found, unauthorized, invalid input, a third-party "not found"
  response, a unique-constraint hit). It's a normal branch of the control flow.
  This guide.
- **Error** — something we do **not** expect to happen in production and would
  have to *debug* if it ever fired: `backend/unexpected-failures-warn-or-rethrow`.

An exception is expected, so you handle it — but precisely.

**At the HTTP boundary, throw `ApiError` with the right status and a typed code.**
A plain `Error` becomes a 500 and loses the status; an expected condition is not a
500. Use `c.get("requireUser")()` for auth rather than hand-checking `c.get("user")`.

```ts
// ✅
import { ApiError } from "../../lib/api-error.js";

const user = c.get("requireUser")();
const thread = requireOrThrow(await threadsRepo.find(id), () => new ApiError(404, { type: "thread_not_found" }));
if (thread.locked) throw new ApiError(409, { type: "thread_locked" });
```

```ts
// ❌ becomes a 500, no status info
const user = c.get("user");
if (!user) throw new Error("Unauthorized");
if (!thread) throw new Error("Not found");
```

**When catching to branch on a specific expected failure, discriminate with
`instanceof` on a typed error class** — never duck-type `error.name` /
`error.code`. And **rethrow anything you didn't expect**: a `catch` that matches
one known exception must not silently absorb the unknown errors alongside it.

```ts
// ✅ handle the known exception; rethrow the rest (which are errors)
import { ParameterNotFound } from "@aws-sdk/client-ssm";

try {
  return await client.send(new GetParameterCommand({ Name: path }));
} catch (error) {
  if (error instanceof ParameterNotFound) return undefined; // expected: not set yet
  throw error;                                              // unexpected → error path
}
```

```ts
// ❌ duck-typed, AND swallows every other error under the same branch
try {
  return await client.send(new GetParameterCommand({ Name: path }));
} catch (error) {
  if (error instanceof Error && error.name === "ParameterNotFound") return undefined;
  // …every other failure falls through and is lost
}
```
