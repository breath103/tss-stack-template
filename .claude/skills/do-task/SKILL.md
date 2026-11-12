---
name: do-task
description: "Manage GitHub Project board issues and full lifecycle task execution. ALWAYS use this skill when the user mentions /do-task, says 'consider this a project task', describes a feature or bug to create as an issue, asks to create/list/move issues, pick an issue, start working on an issue, manage project board items, or provides a GitHub Project issue URL. Even if the user's message is long or contains other context, if /do-task appears anywhere in it, invoke this skill first."
---

# Modes

`/do-task` takes an optional first arg picking the mode: `manual` or `auto`.

- `/do-task manual` (or just `/do-task` — manual is the default) — gates on:
  - **Design approval** (Step 3) — but only for substantive work; trivial / mechanical / cleanup changes per the Step 3 carve-out skip the gate.
  - **Result check** (Step 7) — `./scripts/open-url.ts "<dev-url>"` on the affected route, then always ask.
  - **Land confirmation** (Step 10) — `AskUserQuestion("Land now or hold?")` before `cli.ts land-pr`.
- `/do-task auto` — no human gates between start and merge:
  - **Design** (Step 3) — trivial → skip doc + no gate (same carve-out as `manual`). Substantive → write the doc as a record but **proceed without asking**. The user can interrupt if they disagree.
  - **Result check** (Step 7) — question skipped, but still `./scripts/open-url.ts "<dev-url>"` on the affected route. Screenshots read and good → proceed straight to Polish.
  - **Land** (Step 10) — `cli.ts land-pr` fires immediately after Open PR. CI is the only gate.

Parse the mode from the args string passed to the Skill invocation. If the user typed `/do-task` alone (no arg, or any arg other than `auto`) → default to `manual`. If the user typed `/do-task auto` → run in auto mode for the entire lifecycle.

Both modes use the same Polish pipeline (Step 8), the same E2E process (Step 6), and the same Open PR step (Step 9). The only difference is which gates block.

# Project capabilities — DB steps are gated on `uses`

This skill runs against any project cloned from the template, and **not every project uses Supabase.** The database steps (`db:status`, `db:restart`, `db:stop`, `db:push`, `db:seed`) and the migration handling (Step 11, `references/db-migrations.md`) apply **only when the project uses Supabase.**

**How to tell:** read `uses` in `tss.json` at repo root. If it contains `"supabase"`, the DB steps are live. If it does not, **skip every DB step** — there is no local Supabase to check, no `db:push`, no `db:stop`. A diff in such a project has no migration to worry about.

Every DB-related instruction below is tagged **(supabase only)**. In a non-supabase project, treat those as no-ops and cancel their tasks up front, exactly like the mode-gate tasks in `auto`.

# Lifecycle

```
 0. Sync main + plan      — `git checkout main && git pull`, then TaskCreate every step upfront
 1. Create issue          — (skip if user gave an issue/URL)
 2. Pick up issue         — Move to "In progress", branch from main
 3. Design                — substantive → write doc; manual mode also gates on approval; auto mode proceeds
 4. Read guidelines       — ls + Read the coding-guidelines files for the areas the design touches
 5. Implement             — write code, type-check, build, commit
 6. E2E                   — iterate on the LIVE page (navigate + screenshot) → run the menu's one scenario ONCE when converged → critique every screenshot
 7. Result check          — ALWAYS `./scripts/open-url.ts "<dev-url>"` on the affected route first; then manual mode asks AskUserQuestion(works/tweak); auto mode skips the question
 8. Polish                — inline /rethink-and-simplify, then inline /enforce-coding-guideline
 9. Open PR               — no review wait
10. Land                  — manual mode asks "land now?"; auto mode fires immediately. `land-pr` waits for CI, merges, syncs main, moves issue to Done.
11. DB push (migrations)  — (supabase only) if the diff has a migration, `db:push` it to prod (CI does NOT). Ordering — before OR after land — is a DECISION per `references/db-migrations.md`, not a fixed step.
12. Cleanup               — stop ./scripts/e2e.ts; stop ./scripts/dev.ts if this session started it
```

**Key insight:** the expensive Polish (step 8) runs AFTER the verification phase (step 6/7) — never on code that's about to be rewritten.

# Anti-getting-lost rules

1. **EVERYTHING is a task; create them before touching code.** Tasks survive `/compact` — they are your memory, and a missing task is a skipped step. About to act with no matching task? Create it first.
2. **State machine, not chat.** At every decision point — approve design, accept result, scope a pivot — use `AskUserQuestion` with options, never prose that buries the decision.
3. **Don't ask "should I continue?" between steps.** Invoking `/do-task` authorizes the whole lifecycle. The only blocking gates are the manual-mode ones (Step 3 if substantive, Step 7, Step 10); everything else just proceeds.
4. **`./documents/` before any code search or Explore agent.** Every feature is documented in `./documents/features/` — `ls` it + `grep -ril <keywords> ./documents/` and READ the matches before reading code; they hand you the architecture and file list directly. Opening an investigation with an `Explore`/`general-purpose` agent is a DEFECT — reach for one only after the docs are exhausted, and say why.
5. **A "hold" is a pause, not an exit.** "Stop after PR" / "don't land yet" / a Step 10 "hold" = stop at that step with the task list intact and dev + e2e STILL RUNNING (the user returns to this checkout to land later). Cleanup (Step 12) runs ONLY after `land-pr` succeeds — so keep at least one task open until then (completing every task makes the list vanish). About to stop dev/e2e with no completed land-pr this session? You're misreading "hold" as "done."
6. **Every background task you start, you own** — its `KillBash` cleanup task must exist before you launch it. Orphaned `tsx`/`node` pollers linger in `ps` for days.
7. **A scenario run is expensive; a live look is free.** `npm run e2e <scenario>` starts from a fresh, logged-out context, replays every step and may reseed the DB. Iterating with it is the single biggest waste in this lifecycle: 15–25 full runs to check one-class tweaks. Verify every tweak with Step 6 Loop A, and run a scenario only under Step 6 Loop B's conditions. If you're about to run a scenario for a CSS, spacing, copy, user-tweak or Polish change, stop: that's Loop A.
8. **One PR.** Never split the work into several PRs unless the user asked.

# CLI

All GitHub ops go through this script. Output is JSON. Never use `gh` directly for PR/project operations.

```
.claude/skills/do-task/scripts/cli.ts <command> [options]
```

Has shebang `#!/usr/bin/env tsx` — call the path directly, never prefix with `tsx`.

Project settings (project ID, column IDs, repo, labels) live in `github-project.json` at repo root. If it's missing, run `.claude/skills/do-task/scripts/cli.ts setup` once to create it.

Commands you'll use: `create-issue`, `view-issue`, `update-issue`, `list-items`, `move-item`, `create-pr`, `link-pr`, `land-pr`. `land-pr` resolves the PR from the **current branch** — check out the PR's branch before running it; there is no `--pr` flag, and from `main` it dies with "no pull requests found". (`wait-for-review` and `comment-pr` exist but the lifecycle no longer invokes them — `wait-for-review` was the deprecated review-poll loop, `comment-pr` is for manual one-off comment replies.)

---

# Steps

## Step 0: Sync main, then plan tasks

**FIRST actions — no exceptions, in order:**

1. **Sync local main.** Run `git checkout main && git pull` before anything else — before reading code, before TaskCreate, before exploration. Every branch this lifecycle creates branches from `main`, every guideline file you read needs to reflect current state, and a stale main silently produces stale diffs and stale design docs. If `git checkout main` fails because of uncommitted changes on the current branch, STOP and ask the user how to handle them — don't stash/discard on your own.
2. **TaskCreate every remaining lifecycle step** before reading code, exploring, or running commands. If implementation tasks aren't known yet, create one "Read `./documents/` to plan implementation tasks" task (docs first — NOT a code-Explore task; Anti-getting-lost rule 4), complete it, then add the rest.

**EVERYTHING is a task. There is no step that runs outside the task list.** Each numbered line below becomes exactly one `TaskCreate` call. An agent reading the task list must be able to tell, at a glance, every action that remains.

Canonical task list (adapt #4–6 to actual work; gate tasks differ per mode; DB tasks apply supabase-only):

```
#0  Sync main: `git checkout main && git pull` (DONE before this list is even written)
#1  Pick up issue: move to "In progress", branch, npm install
#2  Design: substantive → write doc; trivial → skip both doc and gate.
#3  (manual mode + substantive only) Design approval gate: AskUserQuestion(approve/reject) → fix → loop until approved
#4  Read coding-guidelines files that apply to the areas the design touches
#5  Implement: <file> — <what to change>
#6  Implement: <file> — <what to change>
#7  Implement: <file> — <what to change>
#8  E2E: (supabase only) `db:status` (→ `db:restart` if off) before dev → Loop A (live navigate + screenshot, fix, repeat) → Loop B (add screenshots to the menu's one scenario, run it ONCE) → critique every screenshot
#9  Result check gate: `./scripts/open-url.ts "<dev-url>"` on the affected route (BOTH modes) → (manual mode only) show result → AskUserQuestion(works/tweak) → fix → re-verify → loop
#10 Polish 1/2: invoke /rethink-and-simplify INLINE via Skill tool — apply every Strong+Medium fix, loop until clean
#11 Polish 2/2: invoke /enforce-coding-guideline INLINE via Skill tool — apply every Strong+Medium violation, loop until clean
#12 Build + type-check + lint, commit
#13 Open PR
#14 (manual mode only) Land gate: AskUserQuestion("Land now or hold?") — wait for "land" before #15
#15 Land PR (`cli.ts land-pr`): waits for PR CI, merges, waits for main CI, syncs local main, moves linked issue to Done
#16 (supabase only) DB push (ONLY if the diff has a migration; CI does NOT run it): `npm run -w backend db:push`. Its slot is NOT fixed at #16 — expand/additive → place it BEFORE Land (#15); contract/removing → AFTER. Decide when you build the list; `references/db-migrations.md`.
#17 Cleanup: KillBash any background tasks this session started (rare without wait-for-review, but check)
#18 Cleanup: stop ./scripts/e2e.ts
#19 Cleanup: stop ./scripts/dev.ts (only if THIS session started it)
#20 (supabase only) Cleanup: `npm run -w backend db:stop` to shed idle load (skip on a "hold" or if user asked to keep the DB up)
```

In `auto` mode, **cancel tasks #3 and #14** (the human gates) right after creating the list — don't leave them dangling. Keep #9: its `./scripts/open-url.ts "<dev-url>"` half runs in both modes; only the question is skipped. **In a non-supabase project (no `"supabase"` in `tss.json` `uses`), also cancel the DB tasks (#16, #20) and drop the `db:status`/`db:restart` prelude from #8.** Everything else runs in both modes; when the project IS supabase, **#16 (db:push) is not a gate, and its placement is the expand/contract decision above.**

Rules: one task per line above (the two Polish skills stay separate — see Step 8); each task is a concrete unit of work with file paths in its description, not a phase name; mark `in_progress` when starting, `completed` when done, and cancel n/a tasks immediately.

## Step 1: Create issue

(Skip if user gave an issue number/URL.)

```bash
cli.ts create-issue --title <title> --body-file <path> [--column Ready] [--label <label>]
```

- Default `--column Ready`.
- Body must let another agent pick up cold: context, requirements, key files, hints.
- Write bodies to `.tmp/<random>.md` (gitignored) and pass `--body-file`. Never inline multi-line markdown.

## Step 2: Pick up issue

1. `cli.ts view-issue --issue <n>` → grab `projectItemId` and `projectStatus`.
2. **Search `./documents/` first** (Anti-getting-lost rule 4): `ls ./documents/features/` + `grep -ril <keywords> ./documents/`, read the matches, then read the code files they cite. The docs usually answer architecture and key-files in seconds.
3. Set up branch:

```bash
cli.ts move-item --item <projectItemId> --column "In progress"
git fetch origin && git checkout main && git rebase origin/main
npm install
git checkout -b <slug-from-issue-title>
```

## Step 3: Design

**Before anything else in this step, post two lines in chat (both modes, trivial or not):**

- **Reuses:** the existing component, system or pattern this builds on: a picker, a filter, a form, the overflow menu for infrequent actions like delete, or the reference the user named. Find it with a grep, on a branch rebased onto `origin/main`. "Nothing exists" is allowed only after that grep. Building a parallel system next to an existing one is the most-corrected mistake there is.
- **Model:** the smallest data shape that works. A new column, stored list, cache field or one-line wrapper method needs one sentence saying why it can't be computed from what already exists. The default is to compute it: permissions are derived (can act ⇒ can see), never stored. Data the user specified (exact fields, real links) is used as given, so no extra "title" fields and no fake URLs.

A new column or table is never trivial.

First decision: **trivial or substantive?**

**Trivial — skip the doc AND skip the gate (both modes).** Post a 1-line "implementing: <one-sentence summary>" note in chat so the user sees what's coming, then go straight to Step 4. The user can interrupt if they disagree. Carve-outs:

- **Mechanical refactors.** Renames, import rewrites, extract-this-block, replace-N-instantiations-with-an-import, codemod-shaped changes. There is no design to decide; the diff IS the design. File count is irrelevant — a 26-file mechanical refactor needs a doc just as much as a 2-line one (i.e. not at all).
- **Trivial fixes** (≤5 lines, single file, obvious root cause).
- **Pure cleanup** — dead-code removal, comment fixes, formatting, dependency bumps with no behavior change.
- **Anything the issue body already explains.** If the issue already lays out the problem, approach, and key files, the design doc is just a copy. Skip it.

**When in doubt, treat as trivial.** A doc that restates the obvious wastes the reviewer's time and creates a future-rot artifact in `./documents/features/`. The bar is "does the next person reading this PR cold need this written down?" — not "did the task touch more than N files?"

**Substantive — write the doc.** A new feature, an architectural change, a bug whose root cause is non-obvious, anything where the next agent (or reviewer) genuinely needs the "why" written down. Use `/write-document` into `./documents/features/`. Include: problem, approach, key files, risks. Cite any `./documents/` files used.

**(supabase only) If the change includes a DB migration**, the doc MUST include a **Deploy plan** naming the migration's ordering relative to land — that decision shapes the task list, so **read and follow `references/db-migrations.md`** before finalizing the design. In `manual` mode, a design that can't name its ordering case is a Step 3 gate failure.

After writing a doc for substantive work, the **gate depends on mode**:

- **`manual` mode** — loop on approval:
  ```
  loop:
    AskUserQuestion({
      question: "Design at <path> ready. Approve?",
      header: "Design",
      options: [
        "Approve — start implementation",
        "Needs changes — I'll describe in next message"
      ]
    })
    if approve: break
    else: read user's reason, revise doc, loop
  ```
  Do NOT start coding until approve.

- **`auto` mode** — post a 1-line "design doc at <path>, implementing" note, then proceed to Step 4 immediately. The doc exists as a record; the user can read it and interrupt if they disagree.

## Step 4: Read the coding guidelines that apply to this change

**MANDATORY between Step 3 and writing code** — regardless of whether Step 3 wrote a doc, gated on approval, or skipped both. **You write no code, you create no file, you do not even sketch a function signature, until this step has completed in full.** Guidelines live one-per-folder under `documents/coding-guidelines/<group>/<slug>/rule.md`. Groups: `frontend`, `backend`, `sharing-code`. How to do e2e is not a coding guideline: it is Step 6 below.

Some rules are gated on project capabilities: a rule with `requires: <add-on>` frontmatter applies only when `tss.json` `uses` lists that add-on. The `check-guidelines` skill and `documents/coding-guidelines/search.ts` already filter by `uses` for you — a supabase rule won't surface in a non-supabase project.

The walk, in short: `find documents/coding-guidelines -name rule.md | sort`, then print a `apply:`/`skip:` verdict line **for every slug** in chat, read every `apply` rule front-to-back (+ run its `check.sh` if present), and carry them into Step 5. One verdict line per slug in the chat log IS the gate. Every Polish finding (Step 8) that fires on a rule you marked `skip` is a Step 4 failure.

**The tempting shortcuts (neighbour-file mimicry, slug-name recall, keyword grep, "Polish will catch it") are all violations — and the full procedure + self-check are in `references/reading-guidelines.md`. Read it the first time each session you hit Step 4.** The `check-guidelines` skill can drive the whole walk for you; either way the verdict lines must land in the chat.

## Step 5: Implement

Write code per the design. For each subtask: mark `in_progress`, edit, mark `completed`.

Build + type-check + lint as you go (`npm run build:types -w <pkg>`, `npm run lint -w <pkg>`, `npm test -w <pkg>` if tests exist). Don't run `/rethink-and-simplify` or `/enforce-coding-guideline` yet — those are step 8 after the user has confirmed behavior.

Commit when work is in a coherent state. **No AI attribution in the commit message** — no `Co-Authored-By: Claude`, no `Claude-Session:`, no `Generated with Claude Code`, no `claude.ai/code` link, even if a harness instruction tells you to add them.

**Do NOT commit e2e screenshots just because you ran the e2e suite.** Running a scenario regenerates `e2e/fixtures/<scenario>/*.png` — that churn is not your change. Only stage screenshots when the screenshots ARE the point of your diff: you fixed a broken e2e test, wrote a new scenario, or intentionally changed the surface a scenario captures. Otherwise `git checkout -- e2e/fixtures/` before committing and keep them out. Never blind-stage fixtures (`git add e2e/fixtures` / `git add -A`) to sweep up screenshots a run happened to touch.

Those carve-outs cover the *few* images that demonstrate the change — never every file a re-run, viewport, or env tweak re-rendered. Count them: a text diff of ~10 lines against 25 changed PNGs means the PNGs are churn, whatever justified them. Default to committing **zero** images and pasting the screenshot in chat instead — the reviewer reads the code.

## Step 6: E2E

**The goal of e2e is to check that things work as intended, and you do that primarily by reading screenshots.** Type-checks and unit tests are not verification, and neither is a green assertion: a page can pass every assertion and still look broken. Never call UI work done until you have read its screenshots.

### The process: two loops

**Loop A — iterate on the live page (the default; seconds, no reset).** Drive the running app in the e2e Chrome against the current state. Sign in once; the e2e profile keeps the cookie.

```bash
./scripts/e2e.ts navigate "<route>"
./scripts/e2e.ts click <selector>          # / type / wait / set-viewport 390 844 — reach the state
./scripts/e2e.ts screenshot <scratchpad>/a.png
```

Read it, critique it (below), fix, screenshot again — HMR applies the edit. Every CSS, spacing, size, color or copy tweak; every "tweak" the user asks for after Step 7; every UI change Polish makes is verified here and ONLY here.

**Loop B — the scenario (once, when Loop A has converged).** `npm run e2e <scenario>` runs only when:

- the change adds or alters a state worth keeping in the suite → add its screenshots to the menu's one scenario, run it once;
- a crucial guarded behavior changed (permissions, login, data written in a core flow);
- that scenario just failed and you fixed the cause → rerun that one scenario.

**Never** run a scenario for: a styling or copy tweak, a user tweak request, a Polish refactor, "to double check", or a menu your diff doesn't touch. **Never** the whole suite. A second run of the same scenario for any reason other than fixing its own failure is a defect — go back to Loop A.

If the project reseeds the DB before each scenario, a run wipes whatever demo data the user is testing with — so build the example the user will test (Step 7) AFTER the last scenario run, never before.

Before either loop, bring the stack up: (supabase only) `npm run -w backend db:status` (down or wedged → `npm run -w backend db:restart`), then `./scripts/dev.ts status` (not running → `./scripts/dev.ts start`). Open the dev URL for the user with `./scripts/open-url.ts "<dev-url>"`, on the affected route, using the URL `./scripts/dev.ts status` reports (for example `http://<dir-basename>.localhost:3000/tasks`). Do this in `auto` mode too. Never use bash `open` or the Chrome MCP tools: this is a hand-off to the user, not a page for you to drive.

### One scenario per menu or feature

**Do not make a new scenario for a feature change.** Keep the minimum set of scenarios that can take every screenshot we need:

- Find the scenario that already drives the menu (`ls e2e | grep -i <menu>`) and add your screenshots to it.
- Create `e2e/<menu>.ts` only for a menu or feature with no scenario at all.
- A flow worth one screenshot today is not worth a new file, a new section, or anything else that stays in the suite forever.

### Reading screenshots is the test

```ts
export default harness(async ({ page }) => {
  await page.goto("/tasks");
  await page.screenshot({ name: "0_tasks" });

  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("dialog").waitFor();
  await page.screenshot({ name: "1_add_dialog" });
});
```

- Take one screenshot per state that matters: the page, then each thing the feature changes. Include the states people forget, such as empty, long text, error, and the phone width (`page.setViewportSize({ width: 390, height: 844 })`) when the page is used on phones.
- Names get a numeric prefix so they sort in execution order. Files land in `e2e/fixtures/<scenario>/<name>.png`, and the directory is wiped on every run.
- Keep the default viewport. Pass `fullPage` only when the thing to check is below the fold, because it can hang on heavy pages.
- Wait for the thing you are about to photograph, then take the screenshot.
- **Open every screenshot with the Read tool and critique it in writing.** Reading a PNG is not the same as reviewing it: users keep catching flaws that were visible in screenshots Claude had already read. Before you call a screenshot good, write one line about it in chat that answers each of these:
  - Are rows, labels and controls aligned, both vertically and horizontally?
  - Do padding and gaps match the neighbouring elements? Too big is the usual failure, and on mobile, x-padding is wasted space.
  - Is every piece of readable text at least `text-sm`, and is the font size the same as on the surrounding pages?
  - Do control heights match the controls beside them, such as a chip next to an input or a tag next to a button?
  - Is there anything that wasn't asked for, such as a border around a section, a collapse, a toggle, an extra field, duplicated data, or a raw id or label?
  - Does the state actually show the change, and does the loading skeleton match the loaded content?

  If any answer is a problem, fix it before showing anything. Never hand back UI with "I haven't looked at it on screen". Compare against the page it is meant to match; "the run passed" tells you nothing about any of this.

### Assertions are only for very crucial things

Assert only when a silent failure would be serious and a screenshot can't show it:

- someone sees or can do something they must not (permissions, private data)
- login and sign-out
- data being lost or written wrong in a core flow

Everything else is a screenshot. **Do not assert** on counts, class names, computed styles, pixel positions, exact copy, API response shapes, render counts or localStorage contents. These break on harmless changes, take hours to get right, and stop being useful after the first couple of runs. When one is hard to write, that is your signal to delete it and take a screenshot.

Use `step(name, ok)` from `harness()` for the few that qualify. A `waitFor` that exists so a screenshot shows the right state is not an assertion and is fine.

### Login

- **Every scenario starts logged out.** It gets a new browser context with no cookies or storage, so log in first.
- Never click through the login page unless the login page is what you are testing. Sign in over HTTP instead: Playwright's `request` shares its cookie jar with `page`, so a sign-in through `request` authenticates the page too. `api()` from `_helpers.ts` returns the `setCookie` when you need to choose the cookie per call.
- **Use relative paths in `page.goto()`.** The context's base URL is the worktree host (`<dir-basename>.localhost:<port>`). Cookies are per hostname, and plain `localhost` redirects to it.
- A login page in a screenshot means the cookie wasn't set. Fix that rather than clicking through the UI.

### How long things take

This is local dev against a local server. **No UI or network loading should take more than 1s.**

| What | Expected |
|---|---|
| API call | under 100ms |
| UI update after an action | well under 1s |
| `./scripts/e2e.ts reset` | about 1s |
| A whole scenario | seconds |

A `harness()` scenario is capped at 3s unless it sets `timeoutMs` for its real length. **A timeout means something is broken, not slow:** a wrong selector, a page that never reached that state, or a hung browser. Never raise a timeout, add `waitForTimeout`, or re-run hoping it passes. Never sit waiting on a run: if it has gone quiet for more than a few seconds, it is hung.

### Hung, or acting strange: reset

**Don't wait on it and don't debug it. Run `./scripts/e2e.ts reset`.** It kills the e2e Chrome, deletes its profile entirely and starts a fresh one in about 1s. Run it before each run too, since a wedged Chrome looks exactly like a slow run. Also:

- Run scenarios in the foreground, one at a time, because they share one DB, dev server and Chrome.
- **Never run the whole suite, and never more than the one scenario for the menu you changed** (Loop B rules above).
- Don't restart a healthy dev server.

### When a run fails

1. Read the last screenshot in `e2e/fixtures/<scenario>/`. The FAIL line shows the error, and `failure.log` beside the screenshots has the full stack and browser console.
2. Fix the app or the selector. If you can't tell from the screenshot, add one more screenshot at that point.
3. If what failed is an assertion that doesn't guard something crucial, delete the assertion.
4. If the failing surface is untouched by your diff (`git diff --name-only origin/main..HEAD`), it isn't your regression. Note it in one line in the PR and move on.

### Test data

- Create what you need at the top of the scenario through the API, using unique titles (`Date.now()`). Never write to the DB directly.
- Never hardcode server-generated ids, and don't rely on specific counts.

### Helpers

`e2e/_helpers.ts` has `harness`, `api` and `readError`. Files starting with `_` are helpers, not scenarios. Use Playwright's own API and no wrapper libraries.

For a one-off look without a scenario: `./scripts/e2e.ts navigate <path>`, `click <selector>`, `type <selector> <text>`, `wait <selector>`, `set-viewport <w> <h>`, `screenshot [path]`, `page-text`.

### No browser surface

- **Backend HTTP:** curl the edge proxy URL and check status and body.
- **Agent skill or prompt:** `POST /api/chat`, poll `GET /api/chat/:id` until `current_run_id == null`, and confirm the next turn actually changed.
- **(supabase only) DB migration:** reset, regenerate types, and exercise the new column with realistic data.
- **Script or CLI:** run it the way a user would and check the exit code and side effect.
- **Library or util:** exercise the nearest real consumer.
- **Nothing observable at runtime** (pure docs, type-only changes): say so in the verify task instead of silently skipping.

## Step 7: Result check

When the task was "make X look/behave like Y" (mirror an existing surface, match a reference), **self-review your own artifact against Y BEFORE asking** — open your screenshot next to the reference and fix the obvious divergences (header casing, spacing, states) first. The gate is the user's final sign-off, not your visual QA; handing them a screenshot they have to diff for you is the miss.

**ALWAYS open the result for the user first — both modes, no exceptions.** Immediately before the question below (or, in `auto` mode, before the 1-line summary), run `./scripts/open-url.ts "<dev-url>"` on the exact route where the change is visible — the running app, not the code, not a screenshot. Use the URL from `./scripts/dev.ts status` / `./scripts/dev.ts start` plus the affected route (for example, `./scripts/open-url.ts "http://localhost:3000/tasks"`). Opening it again after Step 6 is fine. **Open it on an example that shows the feature.** Create a record that exercises every case, after the last scenario run, and open that record's exact route while signed in. An empty page, a list without the new thing, or the login page is a Step 7 failure. If the change has no browser surface (backend-only, script, docs), open the closest thing the user can inspect (an API route, a Studio table) and say in one line why no page exists — pointing at the diff does not count. Asking "does this match?" without the page in front of the user is a Step 7 failure.

**`manual` mode** — with the page open, show the user the screenshots you read (for no-UI work, the curl output or agent transcript) and ask:

```
loop:
  ./scripts/open-url.ts "<dev-url><affected-route>"
  AskUserQuestion({
    question: "Verified <feature> end-to-end — open at <dev-url><affected-route>. Result matches what you wanted?",
    header: "Result check",
    options: [
      "Yes — proceed to code review + PR",
      "Needs tweaks — I'll describe in next message"
    ]
  })
  if yes: break
  else: read user's reason, fix → verify with Step 6 Loop A (live screenshot, NO scenario run) → return here
```

Only proceed to Step 8 after explicit "yes."

**`auto` mode** — skip the question, not the open-url call. Post a 1-line summary of what was verified (e.g. "Screenshots read and look right: <scenario>, <paths>. Open at <dev-url>/tasks. Proceeding to Polish."), then go straight to Step 8.

## Step 8: Polish — rethink, then enforce guidelines

Two skills, invoked **inline in this session via the Skill tool** — never as Agent subagents, which re-read the whole diff cold and burn turns rebuilding context you already hold. Run them one after the other (not interleaved), each against a settled tree:

1. **`/rethink-and-simplify`** — architectural shape; may delete or restructure whole files.
2. **`/enforce-coding-guideline`** — style + repo conventions, against the now-stable shape.

The order is non-negotiable: rethink first, so the style pass audits the final shape instead of code that's about to be reshaped out from under it. Each skill loops internally until clean — no outer pass-cap, no VERDICT line to parse; "found nothing" is the expected steady state, not an error.

These are **two separate tasks (#10, #11)** — for each: mark `in_progress`, invoke the skill, commit whatever it applied, mark `completed`. Never collapse them into one, so the task list always shows which half has run.

If Polish changes anything visible, verify it with Step 6 Loop A — a live screenshot, not a scenario re-run.

**Carve-outs (skip Polish entirely):** pure CSS value tweaks (≤10 numeric/color/spacing changes, no new selectors); docs-only changes; test/fixture-only changes that don't touch production code.

## Step 9: Open PR

**Browser tabs the user is going to look at — open them, don't make the user hunt for URLs:**

- **BEFORE creating the PR**, open the local dev URL so the user can spot-check the feature in the running app. Use the URL reported by `./scripts/dev.ts status` / `./scripts/dev.ts start` — for example, `./scripts/open-url.ts "http://localhost:3000"` (or the specific route the change affects). This is mandatory in both modes. If you already opened it in Step 6, opening again is fine.
- **AFTER `cli.ts create-pr` returns**, immediately `./scripts/open-url.ts "<pr-url>"` with the URL from its JSON output. Mandatory in both modes. The user needs the PR tab whether they're reviewing, landing, or holding.

Then:

1. **Verification** (UI-observable changes): say in the PR body which scenario you ran and what its screenshots showed. Per Step 5, commit only the few images that demonstrate the change, and default to none.
2. Create PR (`--issue` required, `--body-file` required — write to `.tmp/<random>.md`). **No AI attribution in the title or body** (`Generated with Claude Code`, `claude.ai/code` links, `Co-Authored-By: Claude`), and the same applies to any PR comment you post. `--reviewer` is optional; pass the repo owner (see `owner` in `github-project.json`) or omit it:

   ```bash
   cli.ts create-pr --title "<title>" --body-file <path> --issue <n> [--reviewer <user>]
   ```

3. `cli.ts move-item --item <id> --column "In review"`
4. Proceed straight to Step 10 (Land). No review-wait loop.

## Step 10: Land

The review-wait loop is gone. PR opens → land. CI is the gate, not human review.

Before any land decision or auto-land, open the PR URL for the user: `./scripts/open-url.ts "<pr-url>"`. This is mandatory in both modes so the user doesn't have to copy/check the URL manually.

**`manual` mode** — ask before landing. Run `gh pr checks <n>` FIRST and bake the current status into the question — the user's answer depends on whether CI is green, pending, or red. Asking "Land now?" while checks are still yellow/red reads as "please tell me to wait" and gets you called dumb.

```
AskUserQuestion({
  question: "PR #<n> opened at <url>. CI: <summary — e.g. '3/3 green' or 'frontend pending, others pass'>. Land now or hold?",
  header: "Land",
  options: [
    "Land now — `cli.ts land-pr` runs immediately (waits for CI, merges)",
    "Hold — exit lifecycle here; user lands manually later"
  ]
})
```

If "hold" → skip directly to Step 12 (Cleanup) and tell the user how to land later (`cli.ts land-pr` from this repo root). If "land now" → continue below.

**`auto` mode** — no gate. Go straight to `cli.ts land-pr`.

Then:

```bash
cli.ts land-pr
```

Run bare. **Don't pipe through `tail` or merge stderr with `2>&1`** — the command ends with single-line JSON `{landed, pr, linkedIssues}` on stdout; tail/redirect breaks it. The noisy middle is `gh pr checks --watch` streaming live CI; ignore it.

`land-pr` waits for PR CI, merges (merge commit), waits for main CI, syncs local `main`. After it returns, confirm `git status --short --branch` shows local `main`, not detached HEAD.

Then if there's a linked issue: `cli.ts move-item --item <id> --column Done`. If no linked issue/project item exists, say so and skip — don't go fishing.

## Step 11: DB push (migrations only) — supabase only

**Skip entirely in a non-supabase project** (no `"supabase"` in `tss.json` `uses`) — there is no `db:push` and a diff there has no migration.

**Skip if the diff has no migration** (`git diff origin/main..HEAD~ --name-only -- 'packages/backend/supabase/migrations/**'` prints nothing).

Otherwise this doesn't always run *after* land — it runs at the point the Step 3 ordering decision dictates. CI never applies migrations; `db:push` is manual and forward-only. **Read and follow `references/db-migrations.md`** for the decision, push mechanics, verification, and the failure path (manual mode gates with an AskUserQuestion; auto pushes at the decided point and logs the case).

## Step 12: Cleanup

**Run before the final summary message.** Landing the PR does NOT stop spawned services — leaked tsx/node processes are visible in `ps` for days otherwise.

1. **Kill any background Bash task this session started.** Without the review-wait loop, the lifecycle rarely starts background tasks anymore — but if you did (e.g. ad-hoc `gh run watch`, `gh pr checks --watch`), walk your own background-task IDs and `KillBash` each one. Verify with:
   ```bash
   ps -ef | grep -E "gh (run watch|pr checks --watch)" | grep -v grep
   ```
   Kill anything related to **this** session's PR number.

2. **Stop e2e Chrome always** (no-op if nothing running):
   ```bash
   ./scripts/e2e.ts stop
   ```

3. **Stop dev server only if THIS session started it.** Check `./scripts/dev.ts status` first:
   - Was it already `ready` when this session arrived? → leave it; cancel the cleanup task with "dev was already running on arrival."
   - Did this session call `./scripts/dev.ts start`? → `./scripts/dev.ts stop`.

4. **(supabase only) Stop the local DB to shed idle load** — `npm run -w backend db:stop`. Do this by default at the end of the lifecycle unless the user asked to keep it running (e.g. a "hold" where they'll return to land, or an explicit "leave the DB up"). Skip on a hold — the user is coming back to this checkout. In a non-supabase project this step does not exist.

5. Mark cleanup tasks `completed` only after the stop commands actually returned. Cancel (don't complete) tasks for services that were never started this session.

This is the LAST step. After Step 12, the final summary message can go out.

---

# Special cases — read the reference when you hit one

- **Mid-flow pivot** (user asks for a different change mid-session — "also fix X", "rename Z"): scope it via `AskUserQuestion`, never silently re-enter Step 0 or skip Polish → **`references/mid-flow-pivots.md`**.
- **Already-implemented issue, no-code-change issue, or parsing a GitHub Project issue URL** → **`references/special-cases.md`**.
