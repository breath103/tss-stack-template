# The lifecycle of one scenario

When `npm run e2e <name>` fires, the runner:

1. **Reseeds the DB.** Spawns `npm run -w backend db:seed` (~3s once the dump is cached locally; the first run also downloads it). Truncates every `public.*` table plus `realtime.messages`, then loads the pinned production snapshot. Every scenario sees the same baseline. No orphan rows from prior runs.
2. **Wipes `e2e/fixtures/<name>/`** and recreates it. Whatever's on disk after the run is the latest set of screenshots.
3. **Creates a fresh Playwright `BrowserContext`** connected to the running Chrome over CDP, with `baseURL` set to the edge proxy. Each scenario gets its own context — cookies and localStorage do not leak between scenarios.
4. **Injects `noAnim` cookie** so framer-motion + CSS transitions are short-circuited (no animation-budget waits needed).
5. **Imports the scenario module** and invokes its default export with `{ page, request }`.
6. **Force-exits** when the scenario resolves (kills any dangling supabase/websocket/MQTT clients).

The Playwright `page` is wrapped — `page.screenshot({ name })` is the only legal form (it's typed that way), routing to `e2e/fixtures/<scenario>/<name>.png`.
