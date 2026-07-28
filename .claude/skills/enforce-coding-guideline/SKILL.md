---
name: enforce-coding-guideline
description: Walk the current branch's diff against every applicable coding guideline from documents/coding-guidelines/. Finds the rules that govern the diff (search.ts + per-rule folders), runs each rule's check.sh where one exists, checks the rest by eye, APPLIES every Strong + Medium violation without asking, verifies once, and loops internally until nothing material is left. Use after implementation feels done but before opening / re-pushing a PR. Also owns AUTHORING new rules — anything oxlint can decide from a single file's AST becomes a custom oxlint rule in packages/shared/src/oxlint-rules/, not a prose rule.md.
---

# Enforce Coding Guideline

> Mechanical rule-by-rule walk of the project's coding guidelines against the current diff. The whole point is the **enumeration** — you cannot decide "this rule doesn't apply" without checking the diff against it.
>
> Not architecture — `/rethink-and-simplify` handles that. This skill is style + repo conventions: hardcoded colors, missing active-states, repository-pattern breaks, oversized components, nested ternaries, useEffect rules, anything captured in `documents/coding-guidelines/<group>/<slug>/rule.md`.
>
> The skill loops internally. It does NOT emit a verdict line for an outer orchestrator. It returns only when the diff passes every applicable guideline.

## Layout

Guidelines live **one rule per folder**:

```
documents/coding-guidelines/
  search.ts            # find rules by keyword
  check-all.ts         # run every check.sh, aggregate pass/fail
  <group>/<slug>/
    rule.md            # the rule prose (always present)
    check.sh           # present ⇒ programmatic gate; absent ⇒ review by eye
```

Groups: `frontend`, `backend`, `e2e`, `sharing-code`.

Writing a *new* rule rather than enforcing an existing one? Jump to
**[Authoring a rule](#authoring-a-rule--lint-rule-first-prose-only-as-fallback)** — the answer is
almost always a lint rule, not a `rule.md`.

## When to invoke

- After `/rethink-and-simplify` has settled the architectural shape — style fixes apply against a stable baseline that way.
- After implementation looks "merge-ready" but **before** the human reviewer sees it.
- After every review-iteration push during an open PR.

## Procedure

Each pass is one cycle of: read diff → list applicable rules → check each one-by-one (run check.sh where it exists, eyeball the rest) → apply Strong + Medium → verify if applied → decide whether to loop.

### 1. Read the diff — line-by-line, with one verdict per hunk in chat

```bash
git diff origin/main..HEAD     # committed changes
git diff                       # working tree
git status --short
```

Note which areas the diff touches — that determines which **groups** apply:
- `packages/backend/**` → `backend`
- `packages/frontend/**` → `frontend`
- `e2e/**` → `e2e`
- shared / boundary pure TS → `sharing-code`

**Skimming the diff is the canonical failure mode.** Even though `/rethink-and-simplify` ran before this, the reshape stage may have introduced new line-level bugs (accidental token swaps, off-by-ones in math that was correct pre-reshape, partial refactors). For every changed file, open it with the Read tool. For every hunk, emit ONE chat line with this structure before you touch the rule enumeration:

```
<file>:<line> — <one-line description> — checked: <A>/<B>/<C>
  A intent: <every changed token/literal/classname/keyword listed and confirmed intentional; flag accidental token swaps like `bg-surface-1` → `bg-surface-2`>
  B math:   <if a constant became a function, every caller's `K - 1` / `K + 1` / `K + extras` walked — does the function's return already bake in the adjustment? off-by-ones in grid-template / nth-child / Array-length math are silent at defaults and break in non-default states>
  C consistency: <if one case was "special" before and is now dynamic, EVERY consumer that referenced the old special case is updated — grep for the old name and confirm>
```

ANY hunk that fails A/B/C → fix it as a Strong finding before the rule walk begins. If your chat output does not contain one verdict line per hunk, you have skipped the read pass and the rule walk cannot self-terminate clean.

### 2. Enumerate EVERY rule — `ls` is non-negotiable

**`check-all.ts` is NOT enumeration. It only runs the `check.sh` files — i.e.
the small subset of rules that have a programmatic gate. The MAJORITY of rules
are eye-only (no `check.sh`). Running `check-all` and stopping there means you
audited maybe 30% of the rules and skipped the rest. That is a defect.**

For each touched group, you MUST `ls` the folder and read the FULL list of rule
folder names out loud (in chat) — every single one — before deciding which apply:

```bash
ls documents/coding-guidelines/frontend
ls documents/coding-guidelines/backend
ls documents/coding-guidelines/e2e
ls documents/coding-guidelines/sharing-code   # if shared TS touched
```

Each folder name IS the rule's name — the slug usually tells you what the rule
is about without opening it. Walk the full list and decide, rule-by-rule,
whether it applies. State that decision in chat for every rule you mark as
applicable (slug + one-line reason). You don't have to justify rules you skip,
but you DO have to have considered each one — and the way you prove that to
yourself is by reading the full `ls` output before listing applicable rules.

Keyword search is a supplemental shortcut, NOT a substitute:

```bash
./documents/coding-guidelines/search.ts --group frontend --keywords "className, fetch, useEffect, as unknown"
```

`search.ts` tags each hit `[check]` (a check.sh exists) or `[manual]`. Use it to
catch extra hits AFTER you've walked the full `ls`, never as a replacement for
it — it only matches literal tokens and misses anything phrased differently
from the diff vocabulary.

If no groups apply, **return immediately** with "no applicable guidelines found."

### 3. Read each applicable rule.md

Use Read on the rule.md of every rule in scope. Not skim. Read the prose and the
✅/❌ examples.

**Do not skip "obviously inapplicable" rules at this stage.** "Obviously" is where
misses happen — the 100-line limit, the `cn()`-not-template-literal rule, the
no-raw-`useEffect` rule all read as "obvious" until they get missed.

### 4. Build the checklist — one item per rule folder

Use TodoWrite, one item per rule folder per touched group:

```
[frontend/100-line-component-limit...]          — check  (has check.sh)
[frontend/no-raw-useeffect]                     — check  (manual)
[frontend/never-use-hardcoded-colors...]        — check  (has check.sh)
[backend/all-db-access-goes-through-a-per...]    — check  (manual)
...
```

This list IS the audit plan. You cannot skip an item because it "obviously
doesn't apply" — that's exactly the failure mode this skill exists to prevent.

### 5. Walk the checklist one-by-one

For each item:

1. **If the rule has a `check.sh`**, run it — it's the deterministic answer:
   ```bash
   bash documents/coding-guidelines/<group>/<slug>/check.sh
   ```
   (Or run them all at once: `./documents/coding-guidelines/check-all.ts`.) A
   non-zero exit prints offending `file:line`. Cross-reference against your diff:
   a hit your change introduced is a Violation; a pre-existing hit elsewhere is
   out of scope (note, don't fix).
2. **If there's no `check.sh`** (architectural / judgment rule), check by eye:
   does any changed file contain the pattern the rule names? Does any changed
   line introduce the rule's "❌ Wrong" example? Read the rule text, don't trust
   memory.

Record per item: **Violation** (file:line + concrete fix, ranked Strong /
Medium / Minor) or **Clean**.

### 6. Apply Strong + Medium — without asking

Use Edit. **Do not write "Want me to apply?"** — the user invoked this to GET
fixes. Strong first (descending impact), then Medium. Minor: skip unless trivial.
If a fix expands scope beyond the PR's intent, note it as a follow-up and
**don't apply**.

### 7. Verify — only if fixes applied

If any Strong / Medium fixes were applied, run the project's lint + typecheck
ONCE at the end, plus re-run the relevant `check.sh` (or `check-all.ts`) to
confirm the violation is gone. If verification fails, fix forward in this pass.
If no fixes were applied, **skip verify entirely.**

### 8. Decide whether to loop

- Applied Strong / Medium fixes → loop **once** to confirm no new violations.
- Found nothing → **stop.**

Hard ceiling: 2 internal passes.

### 9. Final report

```
Groups audited: frontend, sharing-code
Rules walked: 14 (6 via check.sh, 8 by eye)
Rules with violations: 3

Pass 1 — applied:
- [frontend/never-use-hardcoded-colors...] login.tsx:42 — bg-blue-600 → bg-accent-1   (check.sh)
- [frontend/interactive-elements-must-have-four...] Button.tsx:38 — added active:scale-95   (eye)
- [frontend/100-line-component-limit...] ChatPanel.tsx — split into ChatPanel + MessageList   (check.sh)
Pass 2 — clean.

Verify: lint clean, types clean, check-all clean.   (or "skipped — no fixes applied")
```

No VERDICT line. The skill has already self-terminated.

## Authoring a rule — lint rule first, prose only as fallback

A `rule.md` costs a read on every future session and is enforced only if an agent
remembers it. A lint rule costs nothing and fails the build. **So: if oxlint can
express the rule, write the lint rule. Do not write prose for it.**

### The gate

Before creating any `documents/coding-guidelines/<group>/<slug>/rule.md`, answer in chat:

> Can this be decided from the AST / source text of a single file?

If **yes** → write an oxlint rule. Stop. There is no `rule.md`. "It's easier to
write it as prose" is not a reason; neither is "the rule has a few exceptions" —
exceptions are `overrides` in `.oxlintrc.json` or an early `return` in `create()`.

Yes covers more than it looks like: banned call/API (`.select("*")`, raw `fetch`),
banned syntax (double casts, `process.env.X!`), banned JSX prop or element,
required-shape ("this construct must go through helper H"), naming/location
constraints, "use in-house X instead of Y". Every rule in
`packages/shared/src/oxlint-rules/` started as one of those.

If **no** → prose `rule.md`. Genuinely-no is cross-file architecture and judgment:
"components under 100 lines" that needs a whole-repo view, repository-pattern
layering, render-isolation, "comment the non-obvious". These are the minority.
Formatting and import order are never either one — Biome already owns those (its
linter is off in this template on purpose; don't turn it on to host a rule).

### Writing the lint rule

1. `packages/shared/src/oxlint-rules/<kebab-name>.ts` — default-export
   `{ meta: { type, docs, messages, schema }, create(context) { … } }`. Copy the
   shape from a neighbour (`no-select-star.ts` is the smallest complete one).
   The message must name the fix, not just the ban.
2. Add `meta.requires: "<add-on>"` **only** if the rule is meaningless without an
   optional add-on (e.g. `"supabase"`). `plugin.ts` no-ops it when the project's
   `tss.json` `uses` doesn't list that add-on. Baseline rules omit it.
3. `<kebab-name>.test.ts` beside it — `RuleTester` from `oxlint/plugins-dev`, with
   `valid` cases covering every carve-out and `invalid` cases asserting `messageId`.
   A rule without a test is not done.
4. Register in `plugin.ts`: import it, add `"<kebab-name>": gate(rule)` to `rules`.
5. Turn it on at `"error"` in the consuming package's `.oxlintrc.json` — scoped via
   `overrides.files` if it only applies to part of the tree. **Never `"warn"`.**
6. Run the package's `lint.ts` over the real tree. Pre-existing hits mean you fix
   them in the same PR or narrow the rule — never land it disabled.

### Writing the prose rule (only after the gate said no)

`documents/coding-guidelines/<group>/<slug>/rule.md`, first line `# <Title>`, then
the prose with ✅/❌ examples. Add `requires: <add-on>` frontmatter if add-on-gated.
`search.ts` and `check-all.ts` pick the folder up automatically — no registry.

A `check.sh` beside it is the old escape hatch for mechanically-checkable rules.
**Prefer an oxlint rule over a new `check.sh`** — it runs in the editor, has a test
harness, and reports per-node. Reach for `check.sh` only when the check is not
per-file (repo-wide invariants, file/dependency graph shape).

## Hard rules

- **Lintable ⇒ lint rule. No prose rule for anything oxlint can decide from one file's AST.** A new `rule.md` whose logic could have been `create(context)` is a defect — delete it and write the rule. State the gate verdict in chat before creating any rule file.
- **`ls` every applicable group, read the FULL list, then decide.** Skipping the `ls` and just running `check-all.ts` is the #1 failure mode of this skill. `check-all` covers only the `check.sh`-gated minority; the eye-only majority gets silently skipped. If your audit report doesn't begin by quoting the `ls` output (or naming every rule folder in every touched group), the audit didn't happen.
- **Run the check.sh, don't eyeball a checkable rule.** If a rule has a check.sh, its verdict is the script's exit code — running it is non-negotiable.
- **Table-shaped eye rules get grepped, not eyeballed.** When a rule ships a "use X instead of Y" table (`use-in-house-components…`), produce the verdict by grepping the scope for each "instead of" pattern (`<button`, `<input`, `<textarea`, `<select`, `fixed inset-0`, rounded-full spans, …) and dispositioning EVERY hit against the table and its carve-outs, in chat. "Looked, nothing jumped out" is exactly how a hand-rolled modal survives the walk.
- **No diplomacy.** "This violates the hardcoded-color rule." Soft critiques are invisible critiques.
- **No vague findings.** Every finding cites file:line + the rule slug + the concrete fix.
- **Don't expand the PR.** Out-of-scope / pre-existing findings → mark as follow-up, don't apply.
- **Don't second-guess the rule.** The rule is the rule.
- **Stop in finite time.** Cap is 2 passes.

## Worked example

**Pass 1** on a branch touching `packages/frontend/src/components/login.tsx`:

Groups in scope: `frontend` only.

Checklist (from `ls documents/coding-guidelines/frontend` + `search.ts`):

```
[frontend/100-line-component-limit...]        — check.sh → login.tsx 87 lines → clean
[frontend/no-raw-useeffect]                   — eye → no useEffect in diff → clean
[frontend/never-use-hardcoded-colors...]      — check.sh → bg-blue-600 line 42 → VIOLATION (Strong)
[frontend/interactive-elements-must-have...]  — eye → new ghost <Button> line 38, no active: → VIOLATION (Medium)
[frontend/use-cn-never-template-literals...]  — check.sh → clean
... (rest of frontend rules, all clean)
```

Applied 2 fixes. Verify clean. → Loop once. **Pass 2:** all clean. Stop. Done.
