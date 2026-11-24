---
name: tss-upstream-change
description: Make a change in the upstream tss-stack-template repo (not this project), then pull it back here via tss-update-template. Use when a desired change belongs in the template itself rather than only this project — e.g. shared config, lint rules, scripts, or reusable patterns.
---

# Instructions

Use this when you're working in a project created from `tss-stack-template`, but the change the user wants is really a **template-level** change — something that should live in the template and benefit every project, not just this one.

The flow: make the change upstream in the template repo → get it approved and merged → pull it back into this project.

## 1. Confirm the change belongs upstream

Sanity-check that this is genuinely a template change (shared config, lint rules, scripts, reusable components/patterns, CI, docs) and not a project-specific customization. If it's project-specific, just make it here directly — do NOT use this skill.

## 2. Locate the template repo

Find the local checkout of `tss-stack-template`:

```bash
ls -d ~/Work/tss-stack-template/.git
```

- If found, use that path.
- If not found, check the `template` remote for the URL (`git remote -v | grep template`) and ask the user where their local clone is, or offer to clone it. **Do not guess a path** — ask.

## 3. Make the change in the template repo via /do-task

Make the requested change in the template repo using `/do-task`, from this same session: `cd <template-checkout>` (an absolute path outside this repo, its own Bash call — the Bash hook allows it, while `git -C` stays rejected), work there, and `cd` back to this repo's root to prove it here. Describe the change to `/do-task` exactly as the user described it here, translated into template terms (generic, not project-specific).

- Work on a branch in the template repo, not directly on `main`.
- Follow the template's own CLAUDE.md / coding guidelines while doing it.

## 4. Prove it in this project, then hand off for approval

Green template CI proves only the template, where the change usually has no real caller. Before asking to land, prove it **here**:

1. On a scratch branch in this project: `git fetch template`, then `git merge --no-ff template/<branch>`, resolving conflicts per `tss-update-template`.
2. `./scripts/ci_local.ts`, then exercise the change through this project's real callers: run the script, hit the code path that uses it. A typecheck is not exercising it.
3. A failure is fixed on the template branch, and you repeat from 1.

Then open the template PR with **this project's** `./scripts/open-url.ts --focus "<pr-url>"`, not the template's (it targets the checkout it lives in). Never bash `open`, never the Chrome MCP tools. Report what step 2 exercised, then stop and let the **user review and approve** the template change, then get it **merged into the template's `main`** (PR merge per the template's rules — e.g. `gh pr merge` without `--squash`).

Do not proceed to step 5 until the change is actually merged upstream. If the user hasn't confirmed the merge, ask.

## 5. Pull the change back into this project

Return to this project and run the `tss-update-template` skill to merge the upstream change back down. Resolve any conflicts per that skill's rules (in particular: FIX code to meet new upstream rules — never disable them).

## 6. Verify

After the merge lands here, confirm the change is present and the project still lints / type-checks / builds.
