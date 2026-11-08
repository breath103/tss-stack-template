# Reading the coding guidelines — the walk, and why shortcuts fail

Step 4 of the lifecycle. The short version lives in SKILL.md; this is the full
procedure plus the rationale for why every tempting shortcut is a violation.

## Why the shortcuts fail (every one of these has produced a real violation)

If you find yourself thinking any of these, you are about to fuck up:

- "I've seen this pattern in a neighbour file, that's good enough." → No.
  Neighbour files are not the source of truth; the rule files are. A neighbour
  can be wrong — it can be the very file the rule was written to fix — and you
  can't tell from reading it.
- "I'll read the rules whose slugs sound related to my task." → No. Most rules
  don't have slugs that map to your task's vocabulary.
  `don-t-name-a-type-you-use-once` doesn't sound like "saved views".
  `draft-state-matches-the-persisted-type` doesn't sound like "modal form". You
  will miss them by recall.
- "I'll grep keywords against the rule directory." → No. `search.ts` is a
  supplemental shortcut for *adding* rules to a list you already walked. It is
  NOT a substitute for the walk.
- "Polish (Step 8) will catch anything I miss." → No. Polish reviews the diff
  against the rules YOU say apply. If you didn't read a rule in Step 4, you won't
  list it in Step 8 either. Skipped here = skipped forever.
- "This rule clearly doesn't apply, I don't need to read it." → Maybe. But state
  the decision out loud BEFORE skipping. Writing "skip: <slug> — <reason>" is
  what forces you to actually consider it instead of glancing past.

## Procedure (do every step, in order)

1. **List ALL rule names** for every group your diff touches:
   ```bash
   find documents/coding-guidelines -name rule.md | sort
   ```
   The slug path (`<group>/<slug>/`) is the rule's name — that alone tells you
   what each rule is about.
2. **Walk the full list and decide, rule-by-rule, whether it applies.** Print the
   verdict in chat for EVERY rule — not just the ones that apply:
   ```
   apply: backend/all-db-access-goes-through-a-per-feature — new repository for tasks_views
   apply: frontend/don-t-name-a-type-you-use-once — modal has a Props interface
   skip:  frontend/never-input-type-date-time-datetime-local-use — no date inputs
   skip:  backend/cross-table-sql-objects-belong-in-the-target — no SQL functions
   ```
   The verdict line must mention the slug. **If your chat output doesn't contain
   one verdict line per slug in the listing, you have not done this step.**
3. **Read the `rule.md` of every rule you marked `apply`, front to back.** Skim is
   not read. After reading, run `check.sh` where one exists (sibling of
   `rule.md`).
4. Carry the relevant rules into Step 5. Polish (Step 8) audits the diff against
   these same rules — every rule you break becomes a Polish finding that forces a
   rewrite. **Every Polish finding that fires on a rule you marked `skip` is a
   Step 4 failure to admit out loud.**

## Self-check before leaving Step 4

"If the user opens the chat log right now, do they see one verdict line per slug
in the rule listing?" If no, you are not done. Go back and finish.

The `check-guidelines` skill can drive this whole procedure; you may invoke it
instead of doing the walk by hand. Either way, the verdict lines must end up in
the chat — that's the gate, not which tool produced them.
