# Cookie-control HTTP — `api()`

When a scenario needs explicit per-call control over which cookie/bearer is sent (e.g. testing "no cookie" and "stale cookie" in the same context that would otherwise auto-fill from the BrowserContext), use `api()` from `_helpers.ts`:

```ts
import { api } from "./_helpers.js";

const signIn = await api<{ user?: { id: string } }>("POST", "/api/auth/sign-in/email", {
  body: { email: "x@y.z", password: "..." },
});
const sessionCookie = signIn.setCookie;  // string | null
const tokenRes = await api<{ token?: string }>("GET", "/api/auth/token", { cookie: sessionCookie });
const noAuth = await api("GET", "/api/me");                          // 401
const badJwt = await api("GET", "/api/me", { bearer: "not.a.jwt" }); // 401
```

`api()` sets `Origin` to the edge proxy so state-changing requests pass better-auth's CSRF check, and safely parses non-JSON 5xx responses. For most scenarios prefer `request.*` (Playwright's) — it shares cookies with `page` automatically.
