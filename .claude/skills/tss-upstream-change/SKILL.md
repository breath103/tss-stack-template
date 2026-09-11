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
git -C ~/Work/tss-stack-template rev-parse --show-toplevel 2>/dev/null
```

- If found, use that path.
- If not found, check the `template` remote for the URL (`git remote -v | grep template`) and ask the user where their local clone is, or offer to clone it. **Do not guess a path** — ask.

## 3. Make the change in the template repo via /do-task

`cd` into the template repo and make the requested change there using `/do-task`. Describe the change to `/do-task` exactly as the user described it here, translated into template terms (generic, not project-specific).

- Work on a branch in the template repo, not directly on `main`.
- Follow the template's own CLAUDE.md / coding guidelines while doing it.

## 4. Hand off for approval

Open the template PR for the user with the template's `./scripts/open-url.ts --focus "<pr-url>"` (run from the template repo) — never bash `open`, never the Chrome MCP tools. Then stop and let the **user review and approve** the template change, then get it **merged into the template's `main`** (PR merge per the template's rules — e.g. `gh pr merge` without `--squash`).

Do not proceed to step 5 until the change is actually merged upstream. If the user hasn't confirmed the merge, ask.

## 5. Pull the change back into this project

Return to this project and run the `tss-update-template` skill to merge the upstream change back down. Resolve any conflicts per that skill's rules (in particular: FIX code to meet new upstream rules — never disable them).

## 6. Verify

After the merge lands here, confirm the change is present and the project still lints / type-checks / builds.
