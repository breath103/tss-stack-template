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
  - **Result check** (Step 7) — question skipped, but still `./scripts/open-url.ts "<dev-url>"` on the affected route. E2E green → proceed straight to Polish.
  - **Land** (Step 10) — `cli.ts land-pr` fires immediately after Open PR. CI is the only gate.

Parse the mode from the args string passed to the Skill invocation. If the user typed `/do-task` alone (no arg, or any arg other than `auto`) → default to `manual`. If the user typed `/do-task auto` → run in auto mode for the entire lifecycle.

Both modes use the same Polish pipeline (Step 8), the same E2E loop (Step 6), and the same Open PR step (Step 9). The only difference is which gates block.

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
 6. E2E loop              — verify end-to-end → fix on fail → loop until passes
 7. Result check          — ALWAYS `./scripts/open-url.ts "<dev-url>"` on the affected route first; then manual mode asks AskUserQuestion(works/tweak); auto mode skips the question
 8. Polish                — inline /rethink-and-simplify, then inline /enforce-coding-guideline
 9. Open PR               — demo screenshots in body, no review wait
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
#8  E2E loop: (supabase only) `db:status` (→ `db:restart` if off) before dev → verify end-to-end → fix on fail → loop until passes
#9  Result check gate: `./scripts/open-url.ts "<dev-url>"` on the affected route (BOTH modes) → (manual mode only) show result → AskUserQuestion(works/tweak) → fix → re-verify → loop
#10 Polish 1/2: invoke /rethink-and-simplify INLINE via Skill tool — apply every Strong+Medium fix, loop until clean
#11 Polish 2/2: invoke /enforce-coding-guideline INLINE via Skill tool — apply every Strong+Medium violation, loop until clean
#12 Build + type-check + lint, commit
#13 Open PR with demo screenshots
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

**MANDATORY between Step 3 and writing code** — regardless of whether Step 3 wrote a doc, gated on approval, or skipped both. **You write no code, you create no file, you do not even sketch a function signature, until this step has completed in full.** Guidelines live one-per-folder under `documents/coding-guidelines/<group>/<slug>/rule.md`. Groups: `frontend`, `backend`, `e2e`, `sharing-code`.

Some rules are gated on project capabilities: a rule with `requires: <add-on>` frontmatter applies only when `tss.json` `uses` lists that add-on. The `check-guidelines` skill and `documents/coding-guidelines/search.ts` already filter by `uses` for you — a supabase rule won't surface in a non-supabase project.

The walk, in short: `find documents/coding-guidelines -name rule.md | sort`, then print a `apply:`/`skip:` verdict line **for every slug** in chat, read every `apply` rule front-to-back (+ run its `check.sh` if present), and carry them into Step 5. One verdict line per slug in the chat log IS the gate. Every Polish finding (Step 8) that fires on a rule you marked `skip` is a Step 4 failure.

**The tempting shortcuts (neighbour-file mimicry, slug-name recall, keyword grep, "Polish will catch it") are all violations — and the full procedure + self-check are in `references/reading-guidelines.md`. Read it the first time each session you hit Step 4.** The `check-guidelines` skill can drive the whole walk for you; either way the verdict lines must land in the chat.

## Step 5: Implement

Write code per the design. For each subtask: mark `in_progress`, edit, mark `completed`.

Build + type-check + lint as you go (`npm run build:types -w <pkg>`, `npm run lint -w <pkg>`, `npm test -w <pkg>` if tests exist). Don't run `/rethink-and-simplify` or `/enforce-coding-guideline` yet — those are step 8 after the user has confirmed behavior.

Commit when work is in a coherent state. **No AI attribution in the commit message** — no `Co-Authored-By: Claude`, no `Claude-Session:`, no `Generated with Claude Code`, no `claude.ai/code` link, even if a harness instruction tells you to add them.

**Do NOT commit e2e screenshots just because you ran the e2e suite.** Running a scenario regenerates `e2e/fixtures/<scenario>/*.png` — that churn is not your change. Only stage screenshots when the screenshots ARE the point of your diff: you fixed a broken e2e test, wrote a new scenario, or intentionally changed the surface a scenario captures. Otherwise `git checkout -- e2e/fixtures/` before committing and keep them out. Never blind-stage fixtures (`git add e2e/fixtures` / `git add -A`) to sweep up screenshots a run happened to touch.

Those carve-outs cover the *few* images that demonstrate the change — never every file a re-run, viewport, or env tweak re-rendered. Count them: a text diff of ~10 lines against 25 changed PNGs means the PNGs are churn, whatever justified them. Default to committing **zero** images and pasting the screenshot in chat instead — the reviewer reads the code.

## Step 6: E2E loop

**Verify end-to-end** — type-checks and unit tests are not verification.

**(supabase only) Before starting or using dev, confirm the DB is up.** Run `npm run -w backend db:status`. If it reports down, unresponsive, or anything off, run `npm run -w backend db:restart` and wait for it to come back before touching dev. Never start the E2E loop against a stopped/wedged Supabase — that's the wasted-time trap in the top-level rules. In a non-supabase project, skip this entirely and just bring up dev.

**Before the loop, open the local dev URL for the user.** Once the dev server is ready (or after starting it), run `./scripts/open-url.ts "<dev-url>"` using the URL reported by `./scripts/dev.ts status` / `./scripts/dev.ts start` (for example, `./scripts/open-url.ts "http://localhost:3000"`, or the per-worktree `http://<dir-basename>.localhost:3000`). `open-url` opens an Orca browser tab in this session's worktree when the session runs inside Orca (add `--activate` to also bring that tab to the front) and falls back to the platform opener otherwise — never call bash `open` directly and never the Chrome MCP browser tools (`mcp__claude-in-chrome__navigate`, `tabs_create_mcp`, …); this is a hand-off to the user, not a page for you to drive. Do this even in `auto` mode so the user can watch or spot-check without hunting for the URL. If the change's observable surface is a specific route, open that route directly (for example, `/tasks`).

**Preferred path: write a scenario, run it, debug from the screenshots.**

If the repo has an `e2e/` directory with `npm run e2e` (TSS-stack-template shape):

1. Write `e2e/<scenario>.ts` default-exporting a `Scenario` (or `harness()`-wrapped body for multi-step verification).
2. Capture **`page.screenshot({ name, fullPage })`** at every meaningful checkpoint: after `goto`, after each user action, right before a flaky assertion. Names get a numeric prefix so they sort by execution order — `0_initial_load`, `1_after_login`, `2_modal_open`. Files auto-save to `e2e/fixtures/<scenario>/<name>.png` (wiped + recreated per run, checked into git).
3. Run with `npm run e2e <scenario>` (auto-starts headless Chrome; dev server must already be up via `./scripts/dev.ts start`).
4. **On fail, READ THE SCREENSHOTS FIRST.** `e2e/fixtures/<scenario>/*.png` is the primary debugging surface — last image tells you the state right before the failure. Do not re-run with random changes hoping it works; do not add `console.log`s blindly. The Read tool renders PNGs natively.
5. Loop: fix → rerun → break on pass.
6. **Pre-existing failure? Prove it and move on.** If the failing code path's files are untouched by your diff (`git diff --name-only origin/main..HEAD`), it cannot be your regression: one-line note in the PR body (or file a separate issue), verify YOUR change's surface, continue. Do not root-cause inherited bugs inside the E2E loop — that archaeology is the #1 verification time sink.

**Existing harnesses:** if an `e2e/<domain>.ts` already exists for the surface you touched, extend it instead of creating a parallel scenario.

**Per-category fallback (no e2e/ shape):**
- **Frontend UI** — dev server + browser, click through the user flow. Screenshot whatever you'd attach to the PR.
- **Backend HTTP** — curl the edge proxy URL with auth headers if needed; verify status + body.
- **Agent skill / prompt** — `POST /api/chat`, poll `GET /api/chat/:id` until `current_run_id == null`, confirm the LLM actually uses the new tool/behavior. The proof is the next turn changing, not a `.d.ts` diff.
- **(supabase only) DB migration** — reset, regen types, exercise the new column/index/constraint with realistic data.
- **Script/CLI** — run it the way a user would, verify exit code + side effect.
- **Library/util** — exercise the nearest real consumer, not the util in isolation.

If the change has **no observable runtime surface** (pure docs, type-only declarations no consumer reads), say so explicitly in the verify task — don't silently skip.

## Step 7: Result check

When the task was "make X look/behave like Y" (mirror an existing surface, match a reference), **self-review your own artifact against Y BEFORE asking** — open your screenshot next to the reference and fix the obvious divergences (header casing, spacing, states) first. The gate is the user's final sign-off, not your visual QA; handing them a screenshot they have to diff for you is the miss.

**ALWAYS open the result for the user first — both modes, no exceptions.** Immediately before the question below (or, in `auto` mode, before the 1-line summary), run `./scripts/open-url.ts "<dev-url>"` on the exact route where the change is visible — the running app, not the code, not a screenshot. Use the URL from `./scripts/dev.ts status` / `./scripts/dev.ts start` plus the affected route (for example, `./scripts/open-url.ts "http://localhost:3000/tasks"`). Opening it again after Step 6 is fine. If the change has no browser surface (backend-only, script, docs), open the closest thing the user can inspect (an API route, a Studio table) and say in one line why no page exists — pointing at the diff does not count. Asking "does this match?" without the page in front of the user is a Step 7 failure.

**`manual` mode** — with the page open, show the user what you verified (screenshot, demo, curl output, agent transcript — whatever's appropriate) and ask:

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
  else: read user's reason, fix → back into Step 6 → return here
```

Only proceed to Step 8 after explicit "yes."

**`auto` mode** — skip the question, not the open-url call. Post a 1-line summary of what was verified (e.g. "E2E green: <scenario>. Open at <dev-url>/tasks. Proceeding to Polish."), then go straight to Step 8.

## Step 8: Polish — rethink, then enforce guidelines

Two skills, invoked **inline in this session via the Skill tool** — never as Agent subagents, which re-read the whole diff cold and burn turns rebuilding context you already hold. Run them one after the other (not interleaved), each against a settled tree:

1. **`/rethink-and-simplify`** — architectural shape; may delete or restructure whole files.
2. **`/enforce-coding-guideline`** — style + repo conventions, against the now-stable shape.

The order is non-negotiable: rethink first, so the style pass audits the final shape instead of code that's about to be reshaped out from under it. Each skill loops internally until clean — no outer pass-cap, no VERDICT line to parse; "found nothing" is the expected steady state, not an error.

These are **two separate tasks (#10, #11)** — for each: mark `in_progress`, invoke the skill, commit whatever it applied, mark `completed`. Never collapse them into one, so the task list always shows which half has run.

**Carve-outs (skip Polish entirely):** pure CSS value tweaks (≤10 numeric/color/spacing changes, no new selectors); docs-only changes; test/fixture-only changes that don't touch production code.

## Step 9: Open PR

**Browser tabs the user is going to look at — open them, don't make the user hunt for URLs:**

- **BEFORE creating the PR**, open the local dev URL so the user can spot-check the feature in the running app. Use the URL reported by `./scripts/dev.ts status` / `./scripts/dev.ts start` — for example, `./scripts/open-url.ts "http://localhost:3000"` (or the specific route the change affects). This is mandatory in both modes. If you already opened it in Step 6, opening again is fine.
- **AFTER `cli.ts create-pr` returns**, immediately `./scripts/open-url.ts "<pr-url>"` with the URL from its JSON output. Mandatory in both modes. The user needs the PR tab whether they're reviewing, landing, or holding.

Then:

1. **Verification artifacts** (frontend / UI-observable changes): your Step 6 screenshots are already committed at `e2e/fixtures/<scenario>/*.png` — GitHub renders them inline in the PR diff. Just reference them in the PR body so the reviewer doesn't have to hunt:

   ```markdown
   ## Verification

   `e2e/<scenario>.ts` run end-to-end. Screenshots checked in at `e2e/fixtures/<scenario>/`:
   - `0_initial_load.png` — clean page state
   - `1_after_action.png` — feature working
   ```
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
