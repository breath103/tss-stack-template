---
name: task-loop
description: "Lightweight, checklist-driven task loop. Use when the user types /task-loop, says 'start a task loop', or asks to set up / run a loop for a multi-step task. Creates a per-loop folder with a lean prompt.md + a checklist-only progress.md, then runs one step at a time via a subagent on request. This is the ONLY loop protocol — do NOT invent an ad-hoc heavier one."
---

# Task Loop

A deliberately simple loop. The whole point is: **a clean checklist + light subagent runs**, not a mountain of process. If you find yourself writing giant progress files, per-step PRs, or CI watchers, you're doing it wrong — that's what this skill exists to prevent.

## Setup — `/task-loop [taskname]` (first run for a task)

1. **Make the folder:** `documents/loops/${YYYY_MM_DD}_${taskname}/` (date = today, from the system context; slug the taskname, e.g. `2026_07_26_billing-revamp`). One folder per loop.
2. **Write `prompt.md`** — the *general* context: what this task is, why, the shape of the work, key constraints/decisions. A page, not a novel. **No exhaustive detail** — details live in referenced side-docs (see below).
3. **Write `progress.md`** — a **checklist ONLY**. No prose, no evidence dumps, no design detail. Nested steps + their sub-steps + a verify line:

   ```markdown
   # <taskname> — progress

   - [ ] 1. Doing X
     - [ ] 1.1 to do so, do Y
     - [ ] 1.2 then do Z
     - [ ] 1.3 verify by <check>
   - [ ] 2. Doing 2
     - [ ] 2.1 ...
   - [ ] WIP  (next task not yet defined — sharpen with the user before running)
   ```

Then STOP. Show the user the checklist and let them steer. Don't start running steps unprompted.

## Running a step — user says "do 1" (or "do 1.2", etc.)

1. **Dispatch a subagent** to do that step (the main agent orchestrates; it does not do the work itself).
2. The subagent follows **SOME** of `/do-task`, not all:
   - **Do:** read the relevant coding guides (`./scripts/list_guides.ts`, then `./scripts/show_guides.ts <n>,<n>,…`) and follow them; implement; run `/rethink-and-simplify` on its own diff and clean up; get the relevant checks green (types + lint + tests for what it touched).
   - **Don't:** it does **NOT** open a PR every time, does **NOT** run `wait-for-review`/any CI watcher, does **NOT** run the full heavyweight lifecycle.
3. **Ask the user how to manage the changes** — commit to the current branch? open a PR? just leave the diff for review? — unless they've already said. Don't default to a PR.
4. The subagent **updates `progress.md`** — tick the checkbox(es) it actually completed (and only those). Ticking = truly done, not "attempted."
5. Relay the result concisely and STOP. Wait for the next "do N".

## Passing detail to a step

Never bloat `progress.md` or the subagent prompt with a design spec. If a step needs real detail, **write a side-doc** in the same loop folder and **reference it** from the checklist:

```markdown
- [ ] 1. Doing X  (design: ./x-design.md)
```

The subagent reads the referenced doc. Keep `progress.md` a pure checklist.

## Rules of thumb

- **progress.md stays a checklist.** If it's growing prose, move that prose into a side-doc and link it.
- **One step per run.** Don't auto-advance to the next step; the user drives with "do N".
- **Match effort to the step.** Mechanical steps → a fast model / no heavy polish; substantive steps → full care. Don't over-process a small change.
- **Parallel is opt-in and rare.** Default to serial, one step at a time. Only parallelize if the user explicitly asks, and never off a fast-moving/unmerged base.
