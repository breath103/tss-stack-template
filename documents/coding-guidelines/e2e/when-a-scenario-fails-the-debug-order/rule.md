# When a scenario fails — the debug order

1. **Read the FAIL line and stack trace** from the runner. It tells you which step failed and where. The terminal copy is deliberately trimmed to save context; the untrimmed error + every browser console line is in `e2e/fixtures/<scenarioName>/failure.log` (gitignored). Read targeted slices of it (`grep`, `sed -n`) only when the trimmed message isn't enough.
2. **Open `e2e/fixtures/<scenarioName>/` and view the screenshots IN ORDER.** The runner already logged the paths during the run — they're at the bottom of the tail output. The last image is the state right before the failure. The Read tool renders PNGs natively; pass the absolute path.
3. **If the screenshot shows an unexpected state** (a 404, a stuck spinner, a modal that didn't open) → fix the app code or the scenario's selector. NOT retry with sleeps.
4. **If the screenshots all look fine but the assertion still failed** → the bug is in the assertion logic. Re-read the assertion against the screenshot. Did the locator pick the wrong row (substring `hasText` matches multiple)? Is the comparison off-by-one?
5. **If you can't tell from screenshots** → add ONE more screenshot at the suspicious checkpoint, not five. Then re-run.

**Things that almost always waste time:**
- Adding `console.log` inside the scenario instead of looking at screenshots.
- Re-running the same failing test with no changes hoping it passes.
- Increasing timeout values until it passes (it'll just fail intermittently on slower CI).
- Reading 1000 lines of frontend code before checking whether the DB is in a weird state.
- Bisecting by reverting your own source to isolate a failure that's **upstream of what you changed**. If the failing step renders a surface your diff never touched (e.g. list rows fail while you only changed a detail panel), your change can't be the cause — it's seed/realtime/env (`db:seed`), and reverting your files to "prove" it wastes time. Reason about blast radius first, then verify the change you actually made in-browser.
