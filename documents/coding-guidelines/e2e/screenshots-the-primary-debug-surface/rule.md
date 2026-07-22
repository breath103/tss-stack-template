# Screenshots — the primary debug surface

```ts
await page.screenshot({ name: "0_initial_load" });   // default viewport — almost always enough
```

How it works:

- Saves to `e2e/fixtures/<scenarioName>/<name>.png`.
- The runner wipes `e2e/fixtures/<scenarioName>/` at the start of every run — what's on disk is always the latest. A crashed mid-run leaves whatever was captured up to that point. That is exactly what you want.
- Screenshots are **committed to git per scenario**. PRs render diffs inline; future agents see the expected look.
- The runner logs each captured screenshot path as `📸 e2e/fixtures/<name>/<file>.png` — visible in tail output of a failing run.
- `page.screenshot({ path: "…" })` is a **type error** by design. There is no escape hatch — every screenshot must have a `name` so it lands in `fixtures/`.

Rules:

1. **Numeric-prefixed names so they sort visually.** `0_initial_load`, `1_after_login`, `2_modal_open`. Not `initial`, `after-login`, `modal` — those sort alphabetically and lie about ordering.
2. **One screenshot per meaningful checkpoint.** After `goto` (did the page load?). After each user action (did the click do what you expected?). Right before a flaky assertion.
3. **Don't pass `fullPage: true` unless you actually need it.** The default viewport-sized screenshot is what almost every assertion checks — header, tabs, the first few rows of a table. `fullPage: true` scrolls the entire page, waits for every off-screen image / lazy section / portal to settle, and on heavy app pages it can hang the scenario long enough to trip the harness timeout. Reach for it only when the failing state genuinely sits below the fold (long activity feed, far-bottom drop-target). The fold contains the answer 95% of the time.
4. **Screenshot BEFORE the assertion, not after.** If the assertion fails, you still want the screenshot.
