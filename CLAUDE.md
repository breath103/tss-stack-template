# Project Instructions

## Deployment

For how to deploy, read `documents/deployment.md`.

## Coding guides

The guides are the standards a person has to hold in mind while writing: one per folder,
`documents/coding-guidelines/<group>/<slug>/rule.md`, groups `frontend`, `backend`,
`sharing-code`. Each title says when the guide applies and what it requires, so you choose
by title. Before writing code:

1. `./scripts/list_guides.ts` — every guide as `<n>. <title>`. Read the titles.
2. Decide which are relevant to what you are building.
3. `./scripts/show_guides.ts <n>,<n>,…` — read those in full.
4. Follow them while implementing.
5. When the code is written: `./scripts/recheck_guides.ts` — your changed files and the titles
   of the guides you have not been shown. Show the ones that match a line you added; fix.

A guide's frontmatter has `topic:` (one of `Guides.TOPICS` in `scripts/lib/guides.ts`) and
`order:` (its place in that topic); a guide tagged `requires: <add-on>` is listed only when
`tss.json` `uses` has that add-on. `./documents/coding-guidelines/check-all.ts` runs only the
`check.sh` files a few guides carry; it is not the re-check.

The `guides` step of `./scripts/ci_local.ts` (so every `git push`) fails for an agent
(`CLAUDECODE=1`) when a file under `packages/`, `modules/` or `scripts/` was changed by the
session and `./scripts/recheck_guides.ts` has not run for that change. Committing, merging
`main` in, or a `lint.ts --fix` reformat is not a change. A person pushing from a terminal
always passes it.

Before writing a row, card or label for an entity, run `./scripts/find_existing.ts
<ComponentName | entity | "label text">`: it lists what `packages/frontend/src` and
`modules/ui/src` already draw for it. `./scripts/lint.ts` fails when one entity-named component
is declared in two files.

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
- **Always finish a change by running the linters with `--fix`, never bare.**
  `./scripts/lint.ts --fix` covers **every** tree; `./scripts/lint.ts <tree> --fix`
  does one (run it with an unknown name to list them). Import order and formatting
  are auto-fixable; running bare lint, reading the report, and hand-editing the file
  wastes a turn on something the tool does in 10ms. Bare `./scripts/lint.ts` is for
  the final green check only.
- **One lint entrypoint, one list of trees.** The `LINT_TREES` table in
  `scripts/lint.ts` is the source of truth for what gets linted; CI runs that one
  script over all of it, and the pre-commit hook calls `--staged` so it derives the
  affected trees from the same table. **Adding a package means adding it there** —
  there are no per-package lint scripts, and a tree absent from the table is linted
  by nothing.
- **oxlint config is three root presets, layered by capability.**
  `.oxlintrc.base.json` (universal, and the ONE `jsPlugins` declaration — a
  `specifier` resolves relative to the file declaring it and inherits through
  `extends`), `.oxlintrc.json` (Node/server tier), `.oxlintrc.react.json`
  (React + Tailwind). A per-tree `.oxlintrc.json` holds only what is genuinely
  local to it. **Overrides are order-sensitive and an inherited config's overrides
  apply first**, so a carve-out cannot switch off a rule that a downstream tier's
  override switches back on — that is why the test-file carve-outs sit at the end of
  each tier rather than in the base.
- **Keep branch names short (~35 chars).** The preview deploy derives a Lambda name
  from `<project>-backend-<branch>` and AWS caps function names at 64 characters.
  A branch like `fix/autoresize-input-height-matches-button-m` overflows it, so
  `deploy` fails *after* lint/test pass. A PR's head ref can't be renamed — the
  only fix is a new branch and a new PR.

## Pre-push CI parity — every `git push` runs the full CI suite locally

The git pre-push hook (`.husky/pre-push`) runs `./scripts/ci_local.ts` on **every**
push and refuses the push when it is red. **Just push; do not run the suite yourself
first**, that only runs it twice. On a red push, fix what the output names and push
again. Never bypass the hook (`--no-verify`, `HUSKY=0`).

```bash
./scripts/ci_local.ts                 # typecheck + lint + test — the verdict without pushing
./scripts/ci_local.ts --only test     # one job: typecheck | lint | test
```

It runs the backend `build-types` first (the frontend typecheck and type-aware oxlint
read its declarations), then every other step in parallel, and prints one
`pass`/`FAIL` line per step plus the output of failed steps only.

**The `JOBS` table in `ci_local.ts` is the step list for typecheck and test.** The
workflow's `typecheck` and `test` jobs run `./scripts/ci_local.ts --only <job>`, so a
step added to `JOBS` runs in CI with no second edit. Lint is the exception: the
workflow shards it (`lint.ts --shard=k/2` plus `knip.ts`), and `JOBS.lint` mirrors
those steps by hand.

## Bash tool hook — the shell rules are enforced

`.claude/settings.json` registers `scripts/hook_bash_policy.mts` as a PreToolUse hook
on the Bash tool. It rejects a command that breaks `.claude/rules/shell.md`,
`.claude/rules/git.md` or a command rule in this file (chaining, `cd` inside the repo,
`$()`, `2>&1`, heredocs, `sed -i` / `python3 -` / `node -e`, `npx`, `tsc`, `git -C`,
`--no-verify`, …) and the rejection names each broken rule and its replacement. Fix
the command; do not look for a spelling the hook misses. The rules are the `RULES`
table in `packages/shared/src/bash-command-policy.ts`: a rule added to the prose is
added there, with a row in its test table, in the same PR.

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
./scripts/ci_local.ts           # The whole CI suite (typecheck + lint + test)
./scripts/lint.ts --fix         # Lint + format every tree, auto-fix
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
./scripts/lint.ts                                      # Lint every tree
./scripts/lint.ts --fix                                # Every tree, auto-fix
./scripts/lint.ts backend --fix                        # One tree
./scripts/lint.ts --staged                             # Only the trees owning staged files
./packages/backend/scripts/build-types.ts              # Type check backend
./packages/frontend/scripts/build-types.ts             # Type check frontend
./scripts/knip.ts                                      # Unused exports/types — every target (CI gate)
./scripts/knip.ts backend                              # One target
```

knip reports unused exports + types by default (the CI gate); pass `--all` to also
surface unused files/deps/members for a manual audit, or `--fix` to auto-remove what
knip can safely delete. Mark an intentional cross-package export (e.g. a type the
frontend imports from the backend) with a `/** @public */` JSDoc tag so the gate
treats it as used.

Linting is [oxlint](https://oxc.rs) (correctness + type-aware rules, plus Tailwind rules via the native `oxlint-tailwindcss` JS plugin) plus [Biome](https://biomejs.dev) (formatting and import order, config in root `biome.json`). Both are Rust-based and fast enough that no caching is needed — every run is a full run.

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

**Never run an e2e scenario to check a tweak, whether or not you're in `/do-task`.** A scenario starts from a fresh, logged-out context and replays every step, and it may reseed the DB. To check a UI tweak, take a live screenshot instead: `./scripts/e2e.ts navigate` / `click` / `screenshot`. Run a scenario only when its screenshots or a guarded behavior actually changed, and run it once; the one exception is rerunning it after fixing its own failure. Never run the whole suite.
