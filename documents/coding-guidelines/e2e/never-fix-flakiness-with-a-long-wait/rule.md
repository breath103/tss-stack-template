# **NEVER fix flakiness with a long wait**

This is the most-violated rule in e2e on this codebase. **Local dev API calls are <100ms.** If something takes longer, it's either:

1. **A real bug** (your code does the wrong thing under contention, or there's an actual race) — fix it.
2. **A wait on the wrong thing** — you're waiting for something that won't happen.
3. **A dev-environment desync** — see CLAUDE.md "When realtime / repo cache appears broken locally" rule. Auto-reseed already handles this for scenarios; for manual debugging, run `db:seed`.

A `await page.waitForTimeout(5000)` to "let realtime settle" is **always wrong**. So is `await locator.waitFor({ timeout: 5_000 })` when the state should appear immediately in local dev. The correct shape is:

```ts
// ✅ Right — wait on the actual condition you care about, with a short local cap.
await page.waitForSelector(`[role="row"]:has-text("${title}")`, { timeout: 1000 });
await page.locator(`[aria-label="Change status"]`).getByText("In progress").waitFor({ timeout: 1000 });
await page.waitForFunction(() =>
  document.querySelectorAll("[data-slot=\"popover-content\"] button[disabled]").length === 2,
);
```

```ts
// ❌ Wrong — fixed sleep. Slow when it passes, still flaky when it doesn't.
await page.waitForTimeout(2000);
expect(/* whatever */).toBe(/* whatever */);
```

The `timeout` argument on Playwright's `waitFor*` methods is a **max**, not a sleep, but it still decides how long a broken wait hides the failure. For local UI/API state, use a short cap like `{ timeout: 1000 }`. Anything longer needs a scenario-specific reason in the code, and `5_000` is not a default.

## The harness `timeoutMs` budget is a guardrail — NEVER raise it to make a failing test pass

This is the same mistake in its most seductive form, and it has been made **over and over**. A scenario fails with `scenario timed out after 3000ms`. The reflex is to bump `harness(..., { timeoutMs: 30000 })`. **This is always wrong.**

The whole-scenario `timeoutMs` (default `3000`) is a deliberate **performance guardrail**. The author set it low because the scenario *should* finish in ~2s against local dev (`<100ms` API calls). A timeout is a **diagnostic signal, not a resource shortage**:

- A fast scenario that times out means **a selector doesn't match and a `click`/`waitFor` is blocking** — the scenario is stuck, not slow. Raising the budget just makes it stuck for *longer* before it fails, and a `click({ force: true })` with no explicit cap will burn Playwright's **30-second** default while it waits for an element that will never appear.
- **Read `scenario timed out` as "something is broken," never as "something needs more time."** Then go find the wrong selector. Fix *that*. The budget stays untouched and the scenario snaps back to ~2s.
- Bumping `timeoutMs` to 30000 turns a 3-second fast-fail into a 30-second hang and **deletes the guardrail** — the exact opposite of the fix. If you catch yourself typing a number into `timeoutMs`, stop: you are editing the wrong file.

```ts
// ❌ Wrong — a stuck selector surfaced as a timeout; "fixed" by deleting the guardrail.
//    Now every future regression hangs 30s instead of failing in 3s.
export default harness(async ({ step, page }) => { /* ... */ }, { timeoutMs: 30000 });

// ✅ Right — leave the budget alone; find the click/waitFor that no longer matches and fix the selector.
//    The scenario returns to finishing in ~2s under the default 3000ms.
export default harness(async ({ step, page }) => { /* ... */ });
```

**The only time `timeoutMs` legitimately rises** is a scenario whose *work* is inherently long — a migration subprocess, many sequential full-page reloads that are intrinsic to what's being tested (e.g. the internal-link scenario). That is a property of the test's design decided *when it's written*, never a reaction to a red run. If a previously-passing scenario starts timing out, the budget is never the answer.

**Allowed exceptions:**
- A genuine "let animation finish" wait — but only if the `noAnim` cookie isn't fully suppressing the animation. The runner sets that cookie automatically.
- A scenario that explicitly tests timing-related behavior (debounce, throttle, etc.).

Outside of those, `waitForTimeout` and long `waitFor*` timeout caps are code smells. Reviewers should reject them.

## The gate

`check.sh` flags the **unambiguous** half of this rule — a fixed sleep
(`waitForTimeout(...)`), which is always wrong. Long `timeout:` caps are NOT
gated: a cap is context-dependent (a genuine file-upload / download / new-tab
wait legitimately needs several seconds), so a blanket numeric gate is too noisy
to be useful. Caps remain a smell for human review; fixed sleeps are the hard
fail.
