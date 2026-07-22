# Retro — turn this session's wasted time into a durable rule

Step 13 of the lifecycle. Run it INLINE (you're already in the session's context)
— do NOT dispatch a subagent. The output is a small, surgical edit to ONE skill
or `CLAUDE.md` — not a new document, not a long section. ONE rule, in the right
file, terse enough that future-you actually reads it.

The mindset: the session had friction — the user pushed back on the same kind of
mistake more than once, or called out something obvious you missed. Apologizing
is not the response. Updating the skill/doc that would have caught it IS the
response, so the next session doesn't repeat.

## Carve-outs (skip retro entirely)

- The lifecycle never reached Step 9 (Open PR) — no completed work to retro on.
- The user explicitly said "skip retro" / "don't retro".

Otherwise run it. Do NOT pre-judge "this session went fine" — the procedure is the
gate, not your confidence. It self-aborts in step 1 if it can't find ≥2 concrete
misses, so running it on a smooth session is cheap.

## Procedure

### 1. Enumerate the actual misses — concrete, in chat

List every distinct thing the user pushed back on this session, in their words.
Three to seven items, file:line where applicable. Don't sanitize, don't
generalize. Examples from a real session:

- "you accidentally flipped `bg-surface-1 → bg-surface-2` in TasksTable.tsx, claimed Polish clean, shipped it"
- "you used `metaColCount - 1` in Dim1RowShell after the function already baked the `- 1` in, broke timeline mode"
- "you wrote 16 CSS selectors `[data-frozen-count="N"]` when `:not(:last-child)` does the same in 1"
- "you claimed `/rethink-and-simplify` ran clean but I found 4 real bugs in the next 30 seconds"

If you can't list ≥2 concrete misses, the session probably didn't need a retro.
Stop and say so.

### 2. Classify each miss

Mark exactly one:

- **doc-gap** — the rule that would have caught this isn't written down anywhere.
- **already-documented** — the rule IS in a skill, you just didn't follow it. Doc
  edit will NOT help; the failure was discipline. Say so out loud.
- **tooling-gap** — no doc edit could have prevented it; the harness/tool is the
  issue.

Most session misses are **already-documented**. That's the uncomfortable answer.
Resist adding a paragraph "just in case" — duplicate rules dilute the originals.

### 3. For doc-gaps only: write the smallest possible edit

One bullet, max ~80 words, in the right file. If you can't decide which file, the
rule probably belongs in the most specific skill — not `CLAUDE.md`, not the
orchestrator (`/do-task`).

**First fork: is the lesson about *how you work* or about *what the code should
look like*?** Process/mindset lessons (audit discipline, verification order, scope
judgment) go in a skill. Stack- or repo-specific code conventions (naming,
component shape, framework idioms, "prefer X primitive over Y") go in the coding-
guidelines catalog (`documents/coding-guidelines/<group>/<slug>/rule.md` — one
rule per folder, so this is the one case where a retro creates a new file). Never
park a code convention in a stack-agnostic skill like `/rethink-and-simplify` —
its own header says stack style lives in the guidelines.

Right-sized edits:
- A new bullet under an existing smell-catalog header in `/rethink-and-simplify`.
- A new line under "Hard rules" in `/enforce-coding-guideline`.
- A new bullet in `CLAUDE.md`'s "Important Rules" — ONLY if project-wide
  (deployment, repo conventions, scripts), not skill-specific.

Wrong-sized edits (don't):
- A new `##` section. If the lesson needs a whole section, it's probably already
  covered and you're duplicating.
- A new skill. The threshold for a new skill is "a complete workflow with multiple
  steps invoked by name", not "a lesson learned."
- Adding the lesson to `CLAUDE.md` when a SKILL.md is the natural home. `CLAUDE.md`
  is effectively in the system prompt — every paragraph is paid for every turn.
- Re-stating an existing rule with different wording. Re-read the target file
  first; if the rule is already there, the failure was discipline (case 2).

### 4. Read the target file BEFORE editing

Always. The most common retro failure is adding a rule that's already in the file
three paragraphs up. If it's already there, mark the miss **already-documented**,
skip the edit, and say so: "this is in `<file>:<line>`. The failure was me not
following it, not the doc."

### 5. Report

One short paragraph per miss:

```
- bg-surface-1 → bg-surface-2 accidental flip
  → already-documented (rethink-and-simplify step 1 "A intent"). Discipline gap, no edit.
- N-case switch where cases differ only in data
  → doc-gap. Added one bullet to rethink-and-simplify smell catalog (RESHAPE Strong).
- "Polish complete" without per-hunk verdicts in chat
  → already-documented (rethink-and-simplify step 1 verdict-line rule). Discipline gap, no edit.
```

Don't write a summary. Don't pad. The user wanted the rule recorded, not a recap.

If the retro applied a doc edit, that edit is uncommitted — leave it for the user
to review and commit separately (do NOT bundle into the PR that already landed).
If it found only discipline gaps, the report itself is the deliverable.

## Hard rules

- **Be honest about discipline gaps.** If the rule is already documented and you
  ignored it, name that. Adding it a second time won't make future-you read it;
  admitting the failure mode might.
- **One bullet per lesson, max.** If you're writing "1. … 2. … 3. …" inside one
  edit, you're adding a section — split or drop.
- **Don't edit `CLAUDE.md` unless the rule is project-wide.**
- **Don't create a new skill from a retro.**
- **No new files unless explicitly asked — except a coding-guideline rule folder**
  when the lesson is a code convention (step 3's fork).
- **Resist documenting everything.** Capture the one lesson that would have saved
  the session — not it plus three adjacent lessons plus a section header. The next
  miss adds the next bullet.

## Worked example

User: "you wasted half this session re-doing the same Polish pass."

1. Enumerate: token swap survived two claimed Polish passes; off-by-one (`K - 1`
   left in callers after `K` became a hook); 16 CSS selectors keyed off
   `data-frozen-count` instead of `:not(:last-child)`; N-case switch bloat (8 cases
   wrapping identical divs).
2. Classify: token swap → already-documented (rethink step 1 A); off-by-one →
   already-documented (rethink step 1 B worked example); 16 selectors → doc-gap;
   N-case switch → doc-gap (same shape).
3. Edit (one bullet, rethink smell catalog under RESHAPE Strong):
   > **N-case switch / if-chain where cases differ only in data.** Eight branches
   > each wrapping an identical `<div className=…>` around a different cell,
   > varying only in 2–3 props → pull the wrapper out, look up the inner via
   > `Record<Id, (ctx) => Node>`. Same smell in CSS: 16 selectors keyed on
   > `[data-count="N"]` → collapse via `:not(:last-child)` / `:has()` / a CSS
   > variable when the predicate has one algebraic form.
4. Report: two of four are discipline gaps, named as such; one bullet added; no new
   files. Done.
