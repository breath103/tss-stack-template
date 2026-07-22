# **Don't pre-flight the API — the UI exercises it for you**

`api()` and `request.*` are for SEEDING test data and AUTH (`devLogin`). They are NOT for assertions about the system. If you find yourself writing a "Backend sanity" / "smoke test" block at the top of a scenario that:

- hits `GET /api/something` and asserts `status === 200`,
- decodes the response and asserts on its shape / count,
- pulls IDs from the response to use as locator selectors below,

**stop**. That's an integration test of the API contract, not an e2e test of the feature. It belongs in `packages/backend/` if anywhere. Two specific problems:

1. **It's redundant with the UI flow below.** The user expanding a project hits that same endpoint. If the response is wrong, the UI assertion fails. The pre-flight is the same contract being tested twice, earlier.
2. **It locks the implementation in place.** Today the endpoint is `POST /api/tasks/countByProject`. Tomorrow it might be rolled into `/api/tasks/counts` or the body shape might change. The UI flow doesn't care. The pre-flight breaks.

The right shape: get the IDs you need from the rendered DOM (`data-row-id`, `data-task-id`, etc.) and the network you observe via `page.on("request", …)`. Both are things the user actually causes.

```ts
// ✅ Right — IDs come from the rendered DOM. Network spying confirms the
// endpoint is hit (and only hit when the user does the thing).
const projectIds = await page.locator(`[data-row-kind="project"]`)
  .evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.rowId)
    .filter((id): id is string => !!id));
stepOrExit("page rendered ≥ 2 project rows", projectIds.length >= 2);

const taskListRequests: string[] = [];
page.on("request", (req) => {
  if (req.method() === "GET" && req.url().includes("/api/tasks?")) {
    taskListRequests.push(req.url());
  }
});
```

```ts
// ❌ Wrong — pre-flights the API to know what to assert about the UI.
// Both lines are double-testing what the UI flow already exercises.
const projects = (await rawApi<Project[]>("GET", "/api/projects", { cookie })).body;
stepOrExit("seeded ≥ 2 projects", projects.length >= 2);
const counts = await rawApi<…>("POST", "/api/tasks/countByProject", { cookie, body: … });
stepOrExit("POST /api/tasks/countByProject → 200", counts.status === 200);
```

The legitimate uses of direct `api()` calls:
- **Seeding extra fixtures** the reseed baseline doesn't include (per "Adding test data" above).
- **`devLogin(email)`** to get a cookie.
- **Testing the auth/permission layer itself** (where the contract IS the subject under test) — e.g. "no cookie → 401", "stale cookie → 401", "wrong tenant → 403". Those scenarios ARE the integration test of the auth contract; that's their explicit purpose.
- **Simulating another actor/realtime update after the page is mounted.** In that case, assert the current visible UI state first, then send the API mutation, then assert the visible UI changed. Do not mutate first and only assert the final state.

Anything else: the UI exercises it.
