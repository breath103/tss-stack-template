# Adding test data

The DB is reseeded before each scenario, so **the scenario creates whatever extra rows it needs at the top**, via the API. Don't write directly to the DB from a scenario.

```ts
import { api, devLogin, harness, injectCookie } from "./_helpers.js";

const ADMIN_EMAIL = "system.coordinator@unastella.com";

export default harness(async ({ step, stepOrExit, page }) => {
  const adminCookie = await devLogin(ADMIN_EMAIL);

  // Create a project + parent task + child task as fixtures for this scenario.
  const stamp = Date.now();
  const proj = await api<{ id: string }>("POST", "/api/projects", {
    cookie: adminCookie,
    body: { title: `My-Test ${stamp}`, priority: 1 },
  });
  stepOrExit("seed project → 200", proj.status === 200);

  const parent = await api<{ id: string }>("POST", "/api/tasks", {
    cookie: adminCookie,
    body: { project_id: proj.body.id, parent_id: null, title: `P-${stamp}`, priority: 1 },
  });
  stepOrExit("seed parent → 200", parent.status === 200);
  // ...
});
```

Rules:

- **Use the API**, not direct DB writes. Tests prove the API contract works, and the auth/permission rules + realtime broadcasts only fire on real API calls.
- **`devLogin(email)`** returns a session cookie for any seed user (or any user you've created via the API). It hits `/api/auth/dev-login` — dev-only endpoint.
- **`api()`** (raw HTTP) for explicit cookie/bearer control. **`request.*`** (Playwright) auto-fills cookies from the BrowserContext — that's what you usually want.
- **`injectCookie(setCookie, page)`** drops a session cookie onto the BrowserContext so subsequent `page.goto()` calls are authenticated. Needed if you did a server-side login via `api()` instead of clicking through the UI.
- **Unique titles per scenario.** Use a timestamp (`Date.now()`) or random suffix when seeding. Even with reseed, a `hasText` locator does substring matching — two rows with similar titles will both match.
- **Name API response envelope types after the operation.** If `POST /api/projects` returns `{ project, membership }`, call that type `CreateProjectResponse`; reserve `Project` for a raw project row such as `ApiRoutes["/api/projects"]["GET"]["response"][number]`.
