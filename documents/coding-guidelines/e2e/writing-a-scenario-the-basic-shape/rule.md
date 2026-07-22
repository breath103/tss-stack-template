# Writing a scenario — the basic shape

```ts
// e2e/login.ts
import assert from "node:assert/strict";
import { type Scenario } from "./_helpers.js";

const scenario: Scenario = async ({ page, request }) => {
  await page.goto("/login");
  await page.screenshot({ name: "0_initial_load" });

  await page.fill('input[name="email"]', "system.coordinator@unastella.com");
  await page.click('button[type="submit"]');
  await page.waitForURL("/");
  await page.screenshot({ name: "1_after_login" });

  // `request` shares cookies with `page` — the post-login session carries through.
  const session = await request.get("/api/auth/get-session");
  assert.equal(session.status(), 200);
};

export default scenario;
```

Key points:

- **Playwright's native API only.** `page.fill`, `page.click`, `page.waitForSelector`, etc. Don't introduce wrapper libraries.
- **`request` and `page` share cookies** — they live in the same BrowserContext. Anything `page` does (login, set cookies) carries through `request`. Use raw `fetch` ONLY when you specifically want an unauthenticated call.
- **`node:assert/strict`** for assertions. No jest, no chai.
- **Files starting with `_`** in `e2e/` are helpers, not scenarios. Reusable helpers go into `e2e/_helpers.ts`.
- **One-shot probing** (no scenario file): `./scripts/e2e.ts navigate /foo`, `./scripts/e2e.ts click <selector>`, etc.
