---
name: rethink-and-simplify
description: Critical architectural audit of the current branch's diff. Rethinks every abstraction, type, parameter, and line against first principles for elegant code. APPLIES every finding without asking, verifies once, and loops internally until nothing material is left. Use after implementation feels done but before opening / re-pushing a PR.
---

# Rethink and Simplify

Ask, recursively, of every hunk you wrote: **if I were solving this problem from scratch today, would I write it this way?** If not, fix it. Loop until yes.

This skill is *mindset*, not a catalog. Stack-specific style rules live in `documents/coding-guidelines/` and get caught by `/enforce-coding-guideline`.

## Principles

Every finding must invoke one. If you can't cite one, it's a style nit — not a rethink finding.

1. **Every line is a cost.** Existence must be justified by present demand, not speculation. Default = delete and see what fails.
2. **Fix at the source, not the leaves.** Same patch at 3+ sites → the shape is wrong upstream. Change the type / schema, not each leaf.
3. **Data, not code.** N branches differing only in values → collapse to a table indexed by the discriminant.
4. **Derive, don't duplicate.** Two declarations of one vocabulary drift. Pick a source; derive the rest — and the source may already live *outside your diff*: before keeping/polishing a bespoke component or util (a modal, form, card, footer), grep the shared library (e.g. `components/ui`, `lib/`) for a primitive it reimplements and adopt that. A clone whose original sits elsewhere in the tree is invisible to a diff-only read; "only 2 local callers" (P7) never justifies a hand-rolled copy of something that already exists shared.
5. **Trust typed boundaries.** Don't re-validate what a typed caller already proved. Validate only at system boundaries.
6. **Preserve semantics under refactor.** Before swapping implementations, grep the callers/columns/types that depend on the *old* one's exact behavior. Convenience-parity ≠ semantic-parity.
7. **Match cost to demand.** Framework / generic / abstraction cost is paid every read forever. Demand real callers, not speculation.

## Procedure

1. **Read the diff.** `git diff origin/main..HEAD`, `git diff`, `git status --short`. Open every changed file — the surrounding context is where bugs hide. For each hunk emit one line in chat: `<file>:<line> — <change> — intent/math/consistency all confirmed`. If the chat log doesn't have one line per hunk, the audit didn't happen.

2. **Apply the 7 principles to each surviving hunk.** Rank by impact. Deletion first (shrinks the diff), reshape second.

3. **Fix without asking.** No "want me to apply?" — the user invoked the skill to GET fixes. Out-of-scope findings → follow-up, don't apply.

4. **Verify once at the end** (project lint + typecheck) if any fixes applied. Skip verify otherwise.

5. **Loop** if the shape changed. Stop when nothing material remains. Hard cap 3 passes.

## Report

```
Pass 1 — applied:
- [P1] <file>: deleted defensive check after auth middleware throws
- [P2] <file>: moved date serialization into schema type (was patched at 5 leaves)
Pass 2 — [P4] <file>: derived Input from Fields, dropped hand-maintained partial
Pass 3 — nothing material.

Verify: clean.
```

Every bullet cites which principle. No principle citation → it doesn't belong.

## Hard rules

- No diplomacy. "This is over-engineered." Soft critiques are invisible.
- No vague findings. `file:line` + principle + concrete fix.
- Don't expand the PR. Follow-up out-of-scope items — but "out of scope" means files your diff doesn't touch. A consistency/vocabulary fix among files you're ALREADY editing (one cell taking `layout: "cell"|"inline"` while its five siblings take `surface: "table"|"detail"`) is in-scope; deferring it as "follow-up / entangled" is the P4 drift you're here to catch, not a scope boundary.
- Don't re-find what you already fixed.
- Don't drift into style. Coding-guideline territory is not this skill.
- **Extract a primitive → migrate every clone it was modeled on, same change.** If you factor a shared component/helper out of an existing pattern, the original hand-rolled instance(s) MUST be pointed at it before you call the work done. A new primitive with its source clone still in place is net-negative — one more thing, zero dedup. Grep for the pattern you just abstracted and convert all of them.
- **Demo/sandbox callers don't create demand (P7).** A `demo/`-only consumer never justifies growing shared vocabulary — a new format type, a shared util, an extra option. Serve the demo with what already exists or keep the addition inside the demo folder; promote to shared only when a real surface needs it.
- **When refactoring, existing shape is not justification.** Before porting a parameter/branch/dependency into the new code, ask what actually feeds it. A timezone param that only ever receives the viewer's own zone, a flag that changes persistence semantics instead of display — collapse them (P1), don't faithfully preserve them.
- Stop in finite time. Cap 3 passes.
