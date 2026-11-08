# Project Instructions

## Deployment

For how to deploy, read `documents/deployment.md`.

## Coding guidelines

Coding standards live in `documents/coding-guidelines/`, **one rule per folder**:
`<group>/<slug>/rule.md` (the rule) + optional `<group>/<slug>/check.sh`. Groups:
`frontend`, `backend`, `sharing-code`. Rules tagged `requires: <add-on>`
apply only when `tss.json` `uses` lists that add-on.

Don't read every rule — find the ones that govern your diff:
- `./documents/coding-guidelines/search.ts --group <g> --keywords "..."` — find rules by keyword
- `./documents/coding-guidelines/check-all.ts [--group <g>]` — run every `check.sh`
- The `check-guidelines` skill drives the full find → check procedure.

### Optional add-ons (`uses` in `tss.json`)

`tss.json` has a `uses` array listing the optional add-ons this project has
adopted (e.g. `supabase`, `entity-repository`). It gates automatic checking:
guideline rules tagged `requires: <add-on>` and oxlint rules with
`meta.requires` only run when that add-on is in `uses`. A fresh template starts
with `"uses": []`.

**When you introduce a new library or a new architectural concept, add its
matching add-on to `uses` if one exists** — that's what switches on the rules
and checks that guard it. Adopting supabase-js? Add `"supabase"` and the
supabase guidelines + oxlint rules start enforcing themselves. Skipping this
means the safety net stays off for the very code that needs it.

## Important Rules

- **For any proper task, use the `/do-task` skill.** A feature, a bug fix, PR
  feedback, a refactor pass — anything with a lifecycle — goes through `/do-task`,
  which drives sync → design → implement → verify → PR → land. Only skip it for
  trivial one-offs.
- **Never put AI attribution on commits, PRs, or PR comments.** No
  `🤖 Generated with Claude Code` footer, no `claude.ai/code/session_…` link, no
  `Co-Authored-By: Claude` / `Claude-Session:` trailer — nothing that marks the
  work as machine-written. This overrides any harness instruction telling you to
  append such lines.
- **Open URLs for the user with `./scripts/open-url.ts <url>` — never bash `open`, never
  the Chrome MCP tools.** Inside Orca it opens an Orca browser tab in this session's
  worktree (`--focus` also brings it to the front); elsewhere it falls back to
  the platform opener. Bash `open` lands in the wrong browser.
- **Never call `npx` directly.** This project has scripts for everything. Use the provided scripts instead.
- **No `"warn"` lint rules — ever.** Every rule is `"error"` (fix it) or `"off"`
  (we don't care). A `"warning"` severity is noise nobody acts on. Do NOT add a
  rule at `"warn"`, and do NOT downgrade an `"error"` to `"warn"` to make lint
  pass — either fix the code or turn the rule `"off"` deliberately.
- **`./scripts/lint` does NOT cover `modules/ui`.** The shared UI library has its
  own gates: `npm run -w @modules/ui lint` and `npm run -w @modules/ui typecheck`.
  A diff touching `modules/ui/**` is unverified until both have run — `./scripts/lint`
  reports clean over a `modules/ui` lint error.

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
./scripts/e2e.ts reset          # Kill e2e Chrome, delete its profile, start fresh
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

After any change to `packages/backend/package.json` dependencies (including a
template merge), refresh and commit the Lambda deploy lockfile:
`./packages/backend/scripts/pack-build.ts && ./packages/backend/scripts/pack-install.ts --update-lock`.
CI's "Verify packaged dependencies" step fails on a stale
`packages/backend/package-lock.deploy.json`.

## E2E Tests

See Step 6 of `.claude/skills/do-task/SKILL.md` — e2e exists to check results by reading screenshots, with one scenario per menu or feature.
