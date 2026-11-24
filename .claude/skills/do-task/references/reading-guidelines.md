# Reading the guides — Step 4

There are few guides on purpose, and each title is one sentence, "When X, do Y." ("When a
request field only accepts a known set of values, validate it with z.enum or z.literal, not
z.string()."). The titles are enough to choose from.

1. `./scripts/list_guides.ts` — read every title. They are grouped by topic.
2. Pick the relevant ones. Relevant means the "When …" part is something you will do, at
   either level: the feature ("when a person will see the page") or a line you will type to
   build it ("when you pre-fill a form from a row", "when you write body copy", "when you
   build a loading skeleton"). Agents reliably pick the first kind and skip the second, and
   every violation found in testing was of the second kind. When unsure, pick it: a guide
   takes a minute to read.
3. `./scripts/show_guides.ts <n>,<n>,…` — read those in full, examples included. Acting on a
   title without its body misses the rules the title has no room for.
4. Follow them while implementing. Keep the list you picked: `/enforce-coding-guideline`
   re-checks the diff against the same guides in Step 8.
5. Once the code is written, run `./scripts/recheck_guides.ts`. It lists your changed files
   and the title of every guide you have not been shown on this branch. For each title: is its
   "When …" part something a line you added did? Show those, fix the code. `ci_local.ts` (and
   so `git push`) fails for an agent until this has run for the current diff; a code change
   after it needs it again, reformatting does not. A repeat run leads with what changed since
   the last one. A line starting `PICKED BUT NOT SHOWN` names guides you asked for and never
   got: run the command it gives first.

What does not replace this step:

- **`./documents/coding-guidelines/check-all.ts`.** It runs the few `check.sh` scripts and
  nothing else. Green there says nothing about the other guides.
- **A neighbour file.** It can be the very file a guide was written to fix, and you can't
  tell from reading it.
- **Step 8.** It re-checks the guides picked here. One you never read is not on its list.
