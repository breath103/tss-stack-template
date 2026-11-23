# Git

- Never use `git -C <path>`. Just run `git` directly — the working directory is already the project root.
- Never add `Co-Authored-By` lines to commit messages.
- Never add "Generated with Claude Code" or similar attribution to PR descriptions.
- When merging PRs, use `gh pr merge --merge` (merge commit). Never use `--squash`.
- Never skip hooks: no `--no-verify`, no `HUSKY=0`. Pre-commit lints and typechecks the staged trees; pre-push runs `./scripts/ci_local.ts`.
- Never bare `git stash` / `git stash pop` — the stash stack is shared by every worktree. Use a WIP commit, or `git stash push -u -m "<unique tag>"` and `git stash apply <sha>`.
