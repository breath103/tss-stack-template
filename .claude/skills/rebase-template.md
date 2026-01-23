# Rebase Template Skill

Rebase the current branch onto the upstream template to pull in template updates.

## Instructions

### 1. Check template remote

First, verify the template remote exists:

```bash
git remote -v | grep template
```

If not found, stop and tell the user to add it:
```
git remote add template git@github.com:breath103/tss-stack-template.git
```

### 2. Fetch and start rebase

```bash
git fetch template
git rebase template/main
```

### 3. Handle conflicts

If rebase succeeds with no conflicts, you're done. Report success.

If conflicts occur, handle them iteratively:

#### For each conflicted file:

1. Run `git status` to see conflicted files
2. For each conflicted file:
   - Read the file to see the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
   - Understand what HEAD (current branch) has vs what template/main has
   - **Decision logic:**
     - If it's a project-specific customization (app name, config values, etc.) → keep HEAD version
     - If it's a template improvement (bug fix, new feature, better pattern) → take template version
     - If both sides have meaningful changes → merge them intelligently
     - If unclear → ask the user which to keep
   - Edit the file to resolve the conflict (remove markers, keep correct code)
   - Stage the resolved file: `git add <file>`

3. Continue the rebase:
   ```bash
   git rebase --continue
   ```

4. Repeat until rebase completes or user aborts

### 4. Already-applied changes

Often the project implements a change first, then it gets applied to the template later. During rebase, you may encounter:
- Conflicts where both sides have the same (or very similar) change
- Empty commits after resolution (the change already exists)

In these cases:
- If the changes are identical or functionally equivalent → keep HEAD, the work is already done
- If template has a slightly better version → take template
- Use `git rebase --skip` if a commit becomes empty after resolution

### 5. Common conflict patterns

| File | Likely resolution |
|------|-------------------|
| `package.json` name/description | Keep HEAD (project-specific) |
| `package.json` dependencies | Merge both, prefer template for shared deps |
| `tss.json` | Keep HEAD (project config) |
| `CLAUDE.md` | Merge both, keep project-specific additions |
| Code files in `packages/*` | Usually take template unless project customized |

### 6. If stuck

If a conflict is too complex or you're unsure:
- Show the user both versions
- Explain what each side changed
- Ask which approach they prefer

### 7. Abort if needed

If user wants to abort:
```bash
git rebase --abort
```
