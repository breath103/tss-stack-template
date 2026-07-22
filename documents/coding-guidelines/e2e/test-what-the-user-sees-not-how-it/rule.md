# **Test what the user sees, not how it's stored**

E2E tests prove the feature works for the user. They are NOT a unit test of the persistence layer. If you find yourself reading `localStorage`, `sessionStorage`, IndexedDB, cookies, or internal React state to assert a feature works, **stop**. The implementation can be rewritten freely tomorrow — your test should not break unless the user-visible behavior breaks.

The shape of a persistence test:

1. Drive the UI into the state you want to persist (click, type, toggle).
2. **Reload the page** (`await page.reload()`).
3. Assert the **rendered UI** reflects the same state.

```ts
// ✅ Right — tests the actual impact. The storage layer is an implementation
// detail; this test passes whether it's localStorage, IndexedDB, or a cookie.
await firstRow.locator("button").first().click();        // expand a project
await firstTasks.first().waitFor({ timeout: 1000 });
await page.reload();
await firstTasks.first().waitFor({ timeout: 1000 });     // still expanded after reload?
step("expansion survives reload", await firstTasks.count() > 0);
```

```ts
// ❌ Wrong — locks the implementation in place. Refactor the storage key,
// switch to IndexedDB, or rename a field and the test breaks even though
// the user-facing behavior is unchanged.
const stored = await page.evaluate(() => localStorage.getItem("tasks:opened-projects"));
const parsed = stored ? JSON.parse(stored) as string[] : null;
step("opened list contains first project", parsed?.includes(first.id) ?? false);
```

If the only place a behavior is observable is in storage (a flag nobody reads, a counter nothing renders), the feature itself doesn't matter — there is no behavior to test. Delete the feature or surface it in the UI.

This rule applies beyond persistence — assert on rendered output, network requests, navigation, and other things the user can observe. Don't assert on internal stores, reducer state, or framework instrumentation.
