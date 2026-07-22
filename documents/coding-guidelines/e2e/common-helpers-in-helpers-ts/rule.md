# Common helpers in `_helpers.ts`

| Helper | What it does |
|---|---|
| `harness(body, { timeoutMs? })` | Wraps a scenario with per-step pass/fail recording + summary. |
| `api(method, path, opts?)` | Raw HTTP with explicit cookie/bearer control. Sets `Origin` for CSRF. |
| `devLogin(email)` | Hits `/api/auth/dev-login`, returns the `set-cookie` string. |
| `expandProject(page, projectId, timeout?)` | Opens a project row from `/tasks` if it is not already expanded. |
| `injectCookie(setCookie, page)` | Parses set-cookie + drops it onto the BrowserContext. |
| `logout(page)` | Clears cookies + storage. Only needed for "log out and verify unauthed view" flows. |

For ad-hoc browser actions outside a scenario, the e2e CLI also exposes: `./scripts/e2e.ts navigate <path>`, `click <selector>`, `type <selector> <text>`, `wait <selector>`, `run-js <expression>`, `screenshot [path]`, `page-text`, `set-viewport <w> <h>`.
