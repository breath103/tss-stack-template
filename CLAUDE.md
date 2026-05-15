# Project Instructions

## Deployment

- **CI deploys automatically on merge to main.** Never deploy manually.
- **Never use `--squash` when merging PRs.** Use `gh pr merge` without `--squash`.

See `documents/coding-guidelines/` for coding standards:
- `backend.md` - Backend (packages/backend)
- `frontend.md` - Frontend (packages/frontend)

## Important Rules

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
```

Lint scripts use ESLint's content cache by default under `node_modules/.cache/eslint/` so repeated local runs are fast. For final/full verification, run the same lint command with `--no-cache` (for example, `./scripts/lint --no-cache` or `./packages/frontend/scripts/lint.ts --no-cache`) so external rule inputs such as Tailwind CSS config/global CSS cannot leave stale cached results.

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

### Writing a scenario

Each file default-exports a `Scenario`. The runner creates a fresh BrowserContext per scenario with `baseURL` preset to the edge proxy, so paths can be relative.

```ts
// e2e/login.ts
import assert from "node:assert/strict";
import { type Scenario } from "./_helpers.js";

const scenario: Scenario = async ({ page, request }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "kurt@example.com");
  await page.click('button[type="submit"]');

  // `request` shares cookies with `page` — the post-login session carries through.
  const me = await request.get("/api/me");
  assert.equal(me.status(), 200);
};

export default scenario;
```

- `page` and `request` share cookies (same BrowserContext). Use `request.*` for any backend call that needs the session; use raw `fetch` only when you specifically want an unauthenticated call.
- Use Playwright's native API (`page.fill`, `page.click`, `page.waitForSelector`, `page.screenshot({ path, fullPage })`, …) and `node:assert/strict` for assertions.
- Files in `e2e/` starting with `_` are treated as helpers, not tests. Add reusable scenario helpers (e.g. `login(page, …)`) to `e2e/_helpers.ts`.
- For ad-hoc probing without writing a file, the one-shot commands still work: `./scripts/e2e.ts navigate /foo`, `./scripts/e2e.ts click <selector>`, etc.
