# Mid-flow pivots

Read this when the user asks for a different change mid-session ("also fix X",
"tweak Y", "rename Z"). Use `AskUserQuestion` to scope it — never silently
re-enter Step 0 or skip Polish.

```
AskUserQuestion({
  question: "You're asking for <X>. How should I handle it?",
  header: "Pivot scope",
  options: [
    "Add to current PR — re-enter Step 5 (implement) → Step 6 (e2e) → [Step 7 if manual] → Step 8 (Polish) → push",
    "Land current PR first, then new lifecycle for <X>",
    "Drop current, fully switch to <X>",
  ]
})
```

Regardless of choice: **TaskCreate the procedural tasks (Polish, e2e, push)
before editing any code for the new work.** The already-completed Polish tasks
for the previous diff don't carry over.

If the pivot touches a **new area of the codebase** (e.g. backend after a
frontend-only branch), **re-run Step 4** for the newly-touched area before writing
code — read whichever coding-guidelines file you didn't already read this session.

If the pivot introduces a **codebase-wide gate or transform** (a new lint rule, a
codemod, a sweep), **rebase onto latest `main` BEFORE measuring the blast
radius.** The branch may be many commits stale by mid-session; a finding-count or
conflict set computed against a stale base gets thrown away and redone against
fresh `main`.

Visual nits ARE code changes ("make column X narrower", "shrink padding"). The
size of the change does not determine whether Polish fires; pushing additional
commits to an open PR does. (Pure value tweaks — colors, spacing — qualify for the
CSS-value carve-out in Step 8.)

**The "Land current PR first" path is mode-aware** — in `auto` mode the current PR
may have already landed by the time the pivot arrives, in which case the pivot
starts a fresh lifecycle from Step 0.
