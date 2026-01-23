---
name: tss-update-template
description: Merge the upstream template into the current branch to pull in template updates. Use when the user wants to sync with the template repo or mentions "update template".
---

# Instructions

## 1. Check template remote

Verify the template remote exists:

```bash
git remote -v | grep template
```

If not found, stop and tell the user to add it:
```
git remote add template git@github.com:breath103/tss-stack-template.git
```

## 2. Fetch and start merge

```bash
git fetch template
git merge --no-ff template/main
```

## 3. Handle conflicts

If merge succeeds with no conflicts, report success.

If conflicts occur, handle them:

1. Run `git status` to see conflicted files
2. For each conflicted file:
   - Read the file to see conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
   - **Decision logic:**
     - Project-specific customization (app name, config) → keep HEAD
     - Template improvement (bug fix, better pattern) → take template
     - Both have meaningful changes → merge intelligently
     - Unclear → ask the user
   - Edit to resolve, then `git add <file>`
3. After all conflicts resolved, commit the merge

## 4. Common conflict patterns

| File | Resolution |
|------|------------|
| `package.json` name/description | Keep HEAD |
| `package.json` dependencies | Merge both, prefer template for shared deps |
| `tss.json` | Keep HEAD |
| `CLAUDE.md` | Merge, keep project-specific additions |
| Code in `packages/*` | Take template unless project customized |

## 5. If stuck

Show user both versions, explain changes, ask preference.

## 6. Abort

If user wants to abort: `git merge --abort`
