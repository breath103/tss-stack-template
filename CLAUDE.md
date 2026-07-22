# Project Instructions

## Deployment

- **CI deploys automatically on merge to main.** Never deploy manually.
- **Never use `--squash` when merging PRs.** Use `gh pr merge` without `--squash`.

## Coding guidelines

Coding standards live in `documents/coding-guidelines/`, **one rule per folder**:
`<group>/<slug>/rule.md` (the rule) + optional `<group>/<slug>/check.sh`. Groups:
`frontend`, `backend`, `e2e`, `sharing-code`. Rules tagged `requires: <add-on>`
apply only when `tss.json` `uses` lists that add-on.

Don't read every rule — find the ones that govern your diff:
- `./documents/coding-guidelines/search.ts --group <g> --keywords "..."` — find rules by keyword
- `./documents/coding-guidelines/check-all.ts [--group <g>]` — run every `check.sh`
- The `check-guidelines` skill drives the full find → check procedure.

## Important Rules

- **For any proper task, use the `/do-task` skill.** A feature, a bug fix, PR
  feedback, a refactor pass — anything with a lifecycle — goes through `/do-task`,
  which drives sync → design → implement → verify → PR → land. Only skip it for
  trivial one-offs.
- **Never call `npx` directly.** This project has scripts for everything. Use the provided scripts instead.

## Worktrees

To run multiple instances side-by-side (one per branch), use git worktrees plus a per-checkout `tss.override.json`:

```bash
git worktree add ../myapp-2 some-branch
cd ../myapp-2
npm install
```

Then create `tss.override.json` (gitignored) in the new worktree:

```json
{
  "dev": { "worktree": "2" },
  "edge":     { "devPort": 3010 },
  "backend":  { "devPort": 3011 },
  "frontend": { "devPort": 3012 }
}
```

`dev.worktree` combined with `project` namespaces auth cookies (`BETTER_AUTH_COOKIE_PREFIX`), the e2e Chrome CDP port, profile dir, and status file — so two worktrees on `localhost` don't clobber each other's sessions or browsers.

### Dev hostname per worktree

Each worktree's edge proxy answers at `<dir-basename>.localhost` (e.g. `myapp-2.localhost:3010`). `*.localhost` is RFC 6761 reserved for loopback, so the browser resolves it without `/etc/hosts` and — crucially — scopes cookies per hostname. Without this, every worktree's better-auth cookies pile under `localhost` and request headers eventually blow past the proxy limit (`HTTP 431`). Plain `localhost:<port>` and `127.0.0.1:<port>` 308-redirect to the canonical host so cookies can't quietly re-pile.

OAuth providers that disallow non-`localhost` redirect URIs (e.g. Azure AD) won't accept `<worktree>.localhost`. The canonical worktree (`myapp/`) is the only one that can complete those flows; sub-worktrees rely on dev-login helpers instead.

## Running Scripts

All scripts are executable via shebang — no `npm run` or `npx` needed. Run everything from repo root.

### Root-level scripts

```bash
./scripts/dev.ts                # Start all dev servers in foreground (Ctrl-C to stop)
./scripts/dev.ts start          # Start dev servers in background, return when ready
./scripts/dev.ts status         # Show running status + per-process pids
./scripts/dev.ts stop           # Stop background dev server
./scripts/lint                  # Run linters across packages
./scripts/e2e.ts start          # Start headless Chrome for e2e
./scripts/setup.ts              # Interactive project setup
```

`./scripts/dev.ts start` writes `.dev-status.json` (gitignored) tracking
foreground pid + per-process readiness. The foreground guarantees no orphans:

- **Any** subprocess crash (backend, frontend, edge, types) triggers `shutdown()` and tears the whole stack down.
- A detached `sh` reaper watches the foreground pid; when it dies (gracefully, SIGKILL, or crash), the reaper SIGTERMs the pgroup, sleeps 2s, then SIGKILLs the pgroup. Lives in its own session so the SIGTERM blast doesn't take it down before the SIGKILL.
- `stop` SIGTERMs the foreground's pgroup directly; the foreground's reaper finishes the job.

If you need to inspect what's running: `./scripts/dev/status.ts <pid>` prints the full process tree under a given pid (cwd-annotated).

### Package scripts

```bash
# Backend
./packages/backend/scripts/deploy.ts --name=main
./packages/backend/scripts/build.ts
./packages/backend/scripts/logs.ts -n main -t

# Frontend
./packages/frontend/scripts/deploy.ts --name=main
./packages/frontend/scripts/destroy.ts --name=feature-branch

# Edge
./packages/edge/scripts/deploy.ts deploy
./packages/edge/scripts/logs.ts -f origin-request -r us-east-1
```

### Other common commands

```bash
./packages/backend/scripts/lint.ts                     # Lint backend
./packages/backend/scripts/lint.ts --fix               # Lint backend with auto-fix
./packages/frontend/scripts/lint.ts                    # Lint frontend
./packages/frontend/scripts/lint.ts --fix              # Lint frontend with auto-fix
./packages/backend/scripts/build-types.ts              # Type check backend
./packages/frontend/scripts/build-types.ts             # Type check frontend
./packages/backend/scripts/knip.ts                     # Unused exports/types — backend (CI gate)
./scripts/knip.ts                                      # Unused exports/types — frontend (CI gate)
```

Both knip wrappers report unused exports + types by default (the CI gate); pass
`--all` to also surface unused files/deps/members for a manual audit, or `--fix`
to auto-remove what knip can safely delete. Mark an intentional cross-package
export (e.g. a type the frontend imports from the backend) with a `/** @public */`
JSDoc tag so the gate treats it as used.

Linting is [oxlint](https://oxc.rs) (correctness + type-aware rules, plus Tailwind rules via the native `oxlint-tailwindcss` JS plugin — config in each package's `.oxlintrc.json`) plus [Biome](https://biomejs.dev) (formatting and import order, config in root `biome.json`). Both are Rust-based and fast enough that no caching is needed — every run is a full run. The `--no-cache` flag is still accepted (and ignored) for backwards compatibility. Run `./scripts/lint` from repo root to lint everything, or a package's `lint.ts` directly; add `--fix` to auto-fix.

### Install packages

```bash
npm install <package> -w backend
npm install -D <package> -w frontend  # as devDependency
```

## E2E Tests

Tests live in `e2e/<name>.ts` and run with `npm run e2e <name>`:

```bash
npm run e2e                  # list tests
npm run e2e echo             # run e2e/echo.ts
./scripts/e2e.ts run echo    # same, no npm wrapper
```

The runner auto-starts headless Chrome if it isn't running. The dev server (`./scripts/dev.ts start`) must already be up.

### Running e2e — don't waste turns

When running `npm run e2e <name>` from agents/scripts:

- **Timeouts live in the scenario, not the shell.** `harness()` accepts `{ timeoutMs }` (default 3000) — set it in the test file matched to actual work, don't wrap calls in `timeout N` from the outside. The runner force-exits at the end so dangling websocket / MQTT / pubsub clients can't hold the process open.
- **Never `2>&1 | tail -N` a backgrounded run.** `tail` buffers everything until EOF, so the log file stays empty for the entire run and looks identical to "stuck." Either run foreground (output streams directly) or redirect raw (`> log.txt 2>&1`) and `tail -F` the file.
- **Chrome must be up first.** `./scripts/e2e.ts start` returns in <1s if already running; the runner aborts with "Headless Chrome process is dead" otherwise. Run it before the first e2e, not after a hang.
- **Dev server too.** `./scripts/dev.ts status` first — if it's not `ready`, start it and wait; don't blindly invoke e2e.
- **A scenario failed? Read the screenshots first.** `e2e/fixtures/<scenarioName>/*.png` is the primary debugging surface — it's faster than re-running with extra logs. See **Screenshots** below.

### Writing a scenario

Each file default-exports a `Scenario`. The runner creates a fresh BrowserContext per scenario with `baseURL` preset to the edge proxy, so paths can be relative.

```ts
// e2e/login.ts
import assert from "node:assert/strict";
import { type Scenario } from "./_helpers.js";

const scenario: Scenario = async ({ page, request }) => {
  await page.goto("/login");
  await page.screenshot({ name: "0_initial_load", fullPage: true });

  await page.fill('input[name="email"]', "kurt@example.com");
  await page.click('button[type="submit"]');
  await page.waitForURL("/");
  await page.screenshot({ name: "1_after_login", fullPage: true });

  // `request` shares cookies with `page` — the post-login session carries through.
  const session = await request.get("/api/auth/get-session");
  assert.equal(session.status(), 200);
};

export default scenario;
```

- `page` and `request` share cookies (same BrowserContext). Use `request.*` for any backend call that needs the session; use raw `fetch` only when you specifically want an unauthenticated call.
- Use Playwright's native API (`page.fill`, `page.click`, `page.waitForSelector`, `page.screenshot({ name, fullPage })`, …) and `node:assert/strict` for assertions.
- Files in `e2e/` starting with `_` are treated as helpers, not tests. Add reusable scenario helpers (e.g. `login(page, …)`) to `e2e/_helpers.ts`.
- For ad-hoc probing without writing a file, the one-shot commands still work: `./scripts/e2e.ts navigate /foo`, `./scripts/e2e.ts click <selector>`, etc.

### Screenshots — how to debug e2e failures

**This is the primary debugging surface. Use it.** When a scenario fails, the first thing to do is open the screenshots and *look* — don't re-run with random changes hoping it works, don't add console.logs blindly.

How it works:

- `page.screenshot({ name, fullPage })` saves to `e2e/fixtures/<scenarioName>/<name>.png`.
- The runner wipes `e2e/fixtures/<scenarioName>/` at the start of every run, so what's on disk is always the latest. A crashed mid-run leaves whatever was captured up to that point — that's the whole reason this dir exists.
- Screenshots are committed to git per scenario. PRs show diffs visually; future agents see the expected look.
- `page.screenshot({ path: "…" })` is a **type error** by design. The scenario's `page` is a `ScenarioPage` wrapper whose `screenshot` only accepts `{ name }`. There is no escape hatch — if you find yourself wanting one, the answer is to give the screenshot a `name` and let it land in `fixtures/`.

**Rules for writing screenshot-driven scenarios:**

1. **Numeric-prefixed names so they sort visually.** `0_initial_load`, `1_after_login`, `2_modal_open`. Not `initial`, `after-login`, `modal` — those sort alphabetically and lie about ordering.
2. **One screenshot per meaningful checkpoint.** After `goto` (was the page even loaded?). After each user action (did the click do what you expected?). Right before an `assert` that's been flaky.
3. **`fullPage: true` by default.** A 600px viewport hides everything below the fold. There's no reason to crop in a CI run that nobody is watching.
4. **Don't gate screenshots on success.** Put them before the assertion, not after — if the assertion fails, you still want the screenshot.

**When a scenario fails:**

1. Read the FAIL line and stack trace from the runner.
2. Open `e2e/fixtures/<scenarioName>/` and view the screenshots **in order**. The last one tells you the state right before the failure.
3. If the screenshot shows an unexpected state (a 404, a stuck loading spinner, a modal that didn't open), the fix is in the app code or the scenario's selector — not in retrying or adding sleeps.
4. If the screenshots all look fine but the assertion still failed, the bug is in the assertion logic — re-read the assertion against the screenshot.

Reading the image is allowed and encouraged. The Read tool handles PNGs natively; pass the absolute path.

### Multi-step scenarios — opt into `harness()`

Plain `assert.equal(…)` stops on the first failure. For scenarios with many independent checks where you want to see every failure in one run, wrap the body in `harness(…)` from `_helpers.ts`:

```ts
// e2e/things.ts
import { harness } from "./_helpers.js";

export default harness(async ({ step, stepOrExit, log, page, request }) => {
  const r = await request.get("/api/things");
  stepOrExit("GET /api/things → 200", r.status() === 200);  // throws on fail; subsequent steps depend on this

  const list = await r.json();
  step("GET /api/things returns array", Array.isArray(list), `n=${list.length}`);  // records pass/fail, continues

  log("(driving long task — this takes ~30s)");
  // ...
}, { timeoutMs: 5000 });  // optional; default 3000ms — match to actual work
```

`harness` records pass/fail per step, prints a summary at the end, and throws if any step failed — the runner converts that into a `FAIL` line and non-zero exit. `stepOrExit` does NOT narrow types via `asserts ok` (a TS limitation around arrow-function method types); use an explicit `if (!x) throw …` after it when you need narrowing.

The optional second arg `{ timeoutMs }` bounds the whole scenario (default 3000ms). The runner force-exits once the scenario resolves, so dangling websocket/pubsub/MQTT clients can't keep the process alive past the summary — no need for `process.exit(0)` in the scenario or shell-level `timeout`.

### Cookie-control HTTP — `api()` from `_helpers.ts`

When a scenario needs explicit per-call control over which cookie / bearer is sent (e.g. an auth flow that tests "no cookie" and "bad cookie" the same context would otherwise auto-fill), use `api()` instead of `request.*`:

```ts
import { api } from "./_helpers.js";

const signIn = await api<{ user?: { id: string } }>("POST", "/api/auth/sign-in/email", {
  body: { email: "x@y.z", password: "..." },
});
const sessionCookie = signIn.setCookie;  // string | null
const tokenRes = await api<{ token?: string }>("GET", "/api/auth/token", { cookie: sessionCookie });
const noAuth = await api("GET", "/api/me");                                          // 401
const badJwt = await api("GET", "/api/me", { bearer: "not.a.jwt" });                 // 401
```

`api()` sets `Origin` to the edge proxy so state-changing requests pass better-auth's CSRF check, and safely parses non-JSON 5xx responses. For most scenarios prefer `request.*` (it shares cookies with `page` automatically).
