---
name: enforce-coding-guideline
description: Re-check the current branch's diff against the coding guides picked before coding (./scripts/list_guides.ts, ./scripts/show_guides.ts), plus any guide whose title now matches the diff. APPLIES every Strong + Medium violation without asking, verifies once, and loops internally until nothing material is left. Use after implementation feels done but before opening / re-pushing a PR. Also owns AUTHORING new rules — anything oxlint can decide from a single file's AST becomes a custom oxlint rule in packages/shared/src/oxlint-rules/, not a prose guide.
---

# Enforce Coding Guideline

> Re-check the diff against the guides this change was written under. Lint already enforces
> everything lint can decide, on every commit and push; this pass covers what is left: the
> guides, which need judgment.
>
> Not architecture — `/rethink-and-simplify` handles that, and runs first.
>
> The skill loops internally and returns only when the diff passes. No verdict line for an
> outer orchestrator.

Writing a *new* rule rather than enforcing one? Jump to
**[Authoring a rule](#authoring-a-rule--lint-rule-first-a-guide-only-as-fallback)**.

## Procedure

### 1. Read the diff, hunk by hunk

```bash
git diff origin/main...HEAD
git status --short
```

Open every changed file with Read. Skimming is how this pass fails: `/rethink-and-simplify`
may have just reshaped the code and introduced line-level mistakes. For each hunk check:

- **Intent** — every changed token, literal and class name is deliberate (no accidental
  `bg-surface-1` → `bg-surface-2`).
- **Math** — where a constant became a function, each caller's `K - 1` / `K + extras` still
  holds.
- **Consistency** — where a special case became dynamic, every consumer of the old special
  case is updated (grep the old name).

A hunk that fails one of these is a Strong finding. Fix it before step 2.

### 2. Pick the guides

- The guides you picked in `/do-task` Step 4.
- Run `./scripts/recheck_guides.ts`, every time, however small the diff. It lists the changed
  files and every guide not yet shown on this branch. Add any whose title matches a line the
  diff adds, not only the feature: a `text-sm`, a `?? ""`, a skeleton, an empty state, a Save
  button. Lines copied from a neighbour file count.

Read any you have not read this session: `./scripts/show_guides.ts <n>,<n>,…`.

### 3. Check the diff against each picked guide

For each one: does a changed line do what the guide's ❌ example does, or miss what its ✅
example requires? Read the guide text; don't trust memory. Where a guide lists "use X instead
of Y" pairs, grep the changed files for each Y rather than eyeballing.

Six guide folders carry a `check.sh`, and `./documents/coding-guidelines/check-all.ts` runs
those six. It is not the re-check: it says nothing about any other guide. It is green on
`main`, so a failure is a violation this diff introduced.

Record per guide: **Violation** (`file:line`, the guide's title, the concrete fix, ranked
Strong / Medium / Minor) or **Clean**.

### 4. Apply Strong + Medium — without asking

Use Edit. Strong first, then Medium. Minor: skip unless trivial. A fix that expands the PR
beyond its intent is a follow-up note, not an edit.

### 5. Verify — only if fixes were applied

`./scripts/lint.ts --fix`, then `./scripts/ci_local.ts --only typecheck`, once. Fix forward.

### 6. Loop

Applied fixes → one more pass to confirm nothing new. Found nothing → stop. Cap: 2 passes.

### 7. Report

```
Guides checked: 6 (4 from Step 4, 2 added)
Pass 1 — applied:
- [When a request field only accepts a known set of values, …] routes/files.ts:42 — `kind: z.string()` → `z.enum(FILE_KINDS)`
- [When you build an edit form, …] ProfileForm.tsx:38 — disabled ignored isDirty
Pass 2 — clean.
Verify: lint clean, types clean.   (or "skipped — no fixes applied")
```

## Authoring a rule — lint rule first, a guide only as fallback

A guide costs a read on every future task and holds only if an agent remembers it. A lint
rule costs nothing and fails the build. **If oxlint can express the rule, write the lint
rule and no guide.**

### The gate

Before creating any `documents/coding-guidelines/<group>/<slug>/rule.md`, answer in chat:

> Can this be decided from the AST / source text of a single file?

If **yes** → write an oxlint rule. Stop. "It's easier as prose" is not a reason; neither is
"it has a few exceptions" — exceptions are `overrides` in `.oxlintrc.json` or an early
`return` in `create()`.

Yes covers more than it looks like: a banned call or API, banned syntax (double casts,
`process.env.X!`), a banned JSX prop or element, a required shape ("this construct must go
through helper H"), naming and location constraints, "use in-house X instead of Y".

If **no** → a guide. Genuinely-no is cross-file architecture and judgment: layering,
what belongs in a service, how a loading state should look. Formatting and import order are
never either one — the formatter owns those.

### Writing the lint rule

1. `packages/shared/src/oxlint-rules/<kebab-name>.ts` — default-export
   `{ meta: { type, docs, messages, schema }, create(context) { … } }`. Copy the shape from a
   neighbour. The message must name the fix, not just the ban.
2. Add `meta.requires: "<add-on>"` **only** if the rule is meaningless without an optional
   add-on. `plugin.ts` no-ops it when `tss.json` `uses` doesn't list that add-on.
3. `<kebab-name>.test.ts` beside it — `RuleTester` from `oxlint/plugins-dev`, `valid` cases
   for every carve-out, `invalid` cases asserting `messageId`. A rule without a test is not
   done.
4. Register in `plugin.ts`: import it, add `"<kebab-name>": gate(rule)` to `rules`.
5. Turn it on at `"error"` in the root preset it belongs to (`.oxlintrc.base.json`,
   `.oxlintrc.json`, `.oxlintrc.react.json`), scoped with `overrides.files` if it applies to
   part of the tree. **Never `"warn"`.**
6. Run `./scripts/lint.ts` over the real tree. Pre-existing hits are fixed in the same PR, or
   the rule is narrowed — it never lands disabled.

### Writing the guide (only after the gate said no)

`documents/coding-guidelines/<group>/<slug>/rule.md`. No registry: `list_guides.ts` picks the
folder up. Its frontmatter declares `topic:` (one of `TOPICS` in `scripts/lib/guides.ts`) and
`order:` (its position inside that topic); `list_guides.ts` fails without them. Add
`requires: <add-on>` if it is add-on-gated.

**The first line is the title, and the title is all an agent sees when choosing what to
read.** One sentence, "When X, do Y.": X is the moment the agent is in, Y is what to do.

```
# When a request field only accepts a known set of values, validate it with z.enum or z.literal, not z.string().
```

Not a topic ("Error vs exception handling") and not a slogan. One situation per guide: a
second "when" is a second guide.

Then the prose with ✅/❌ examples taken from code that exists today.

A `check.sh` beside the guide is for a check that is not per-file (a repo-wide invariant, SQL
or CSS that oxlint cannot parse). Anything per-file in TS/TSX is an oxlint rule instead.

## Hard rules

- **Lintable ⇒ lint rule.** A new `rule.md` whose logic could have been `create(context)` is
  a defect — delete it and write the rule.
- **No vague findings.** Every finding cites `file:line`, the guide's title and the fix.
- **No diplomacy, and don't second-guess the guide.** "This violates the hardcoded-color
  guide."
- **Don't expand the PR.** Pre-existing findings are follow-ups.
- **Stop in finite time.** Two passes.
