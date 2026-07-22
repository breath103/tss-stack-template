# Use HTTPException for known error status codes

Always throw `HTTPException` with the correct status code. Never throw plain `Error` and rely on the error handler to guess the status. Plain `Error` throws become 500.

Use `c.get("requireUser")()` for auth checks instead of manually checking `c.get("user")`.

```typescript
// ✅ Correct
import { HTTPException } from "hono/http-exception";

const user = c.get("requireUser")();

if (!memory) throw new HTTPException(404, { message: "Not found" });
if (!handler.writable) throw new HTTPException(400, { message: "Channel is not writable" });
```

```typescript
// ❌ Wrong — becomes 500, no status code info
const user = c.get("user");
if (!user) throw new Error("Unauthorized");

if (!memory) throw new Error("Not found");
```
