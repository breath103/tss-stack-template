# Reuse and consolidate scenarios — one cohesive scenario per surface

The e2e suite is a shared, permanent asset. Every scenario **file** costs a full
DB reseed (the runner reseeds per file) and ongoing maintenance. The default when
testing something new is to **extend the existing scenario for that surface — not
add a parallel file.**

## Before writing a new scenario, find the existing one

Search `e2e/` for the surface you're about to touch (the route, the feature, the
component):

```bash
ls e2e | grep -i tasks            # what already covers /tasks?
grep -rl "/objectives" e2e        # which scenarios drive this route?
```

If a scenario already drives that page/flow, **add your steps and assertions to
it.** `harness()` records pass/fail per step, so a longer scenario with more
steps stays debuggable — and it reuses the fixtures and the single reseed already
paid for.

Only create a **new file** for a genuinely new surface — a new route or feature
with no existing coverage.

## Don't split one surface across many files

A surface gets **one** cohesive scenario, not one file per micro-behavior:

```
# ❌ Wrong — one surface, many files (each a separate reseed)
tasks-detail-autosave.ts
tasks-detail-breadcrumb.ts
tasks-detail-url.ts
tasks-detail-selection-and-single-page.ts
tasks-detail-render-isolation.ts

# ✅ Correct — one scenario, multiple harness() steps
tasks-detail.ts   # autosave, breadcrumb, url-sync, selection, render-isolation
```

In particular, **don't make a separate file just for a render-isolation check** —
fold the `useRenderCount` assertion into the main scenario for that surface
(after editing a row, assert the parent's render count didn't bump, as one more
step). See `render-isolation-tests`.

## A longer harness beats N tiny files

The "~100 lines" instinct that applies to React components does **not** apply to
e2e scenario files — a 250-line `harness()` with fifteen clearly-named steps is
cheaper and clearer than fifteen 50-line files that each reseed the DB. Optimize
for *fewer files, fewer reseeds, shared fixtures*, not for short files.

## The gate

`check.sh` flags any **surface** (grouped by the first `-`-delimited token of the
filename) with **more than 8** scenario files — a signal that the surface has
proliferated and should be consolidated into cohesive scenarios.
