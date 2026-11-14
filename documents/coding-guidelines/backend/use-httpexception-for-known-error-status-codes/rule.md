# Use HTTPException for known error status codes

Always throw an `HTTPException` with the correct status code — in practice its subclass `ApiError`,
which carries a typed code instead of a message (see
`sharing-code/api-errors-are-typed-codes-messages-live-on-the-frontend`). Never throw plain `Error`
and rely on the error handler to guess the status. Plain `Error` throws become 500.

Use `c.get("requireUser")()` for auth checks instead of manually checking `c.get("user")`.

```typescript
// ✅ Correct
import { ApiError } from "../lib/api-error.js";

const user = c.get("requireUser")();

if (!memory) throw new ApiError(404, { type: "memory_not_found" });
if (!handler.writable) throw new ApiError(400, { type: "channel_not_writable" });
```

```typescript
// ❌ Wrong — becomes 500, no status code info
const user = c.get("user");
if (!user) throw new Error("Unauthorized");

if (!memory) throw new Error("Not found");
```
