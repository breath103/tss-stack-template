# Shell Commands

These are enforced: a PreToolUse hook (`scripts/hook_bash_policy.mts`, rules in `packages/shared/src/bash-command-policy.ts`) rejects a Bash call that breaks one and says what to run instead.

- Never use `cd` to change into subdirectories. Use `-w <package>` for npm workspace commands, and run everything else from root. `cd` to an absolute path outside this repo (another checkout, e.g. `~/Work/tss-stack-template`) is allowed, as its own Bash call.
- **Never use `cat`/heredoc/`echo`/`printf`/`tee` to write files.** Always use the Write tool. Redirecting to `/dev/null` is fine.
- **Never edit files through the shell** (`sed -i`, `perl -pi`, `python3 -`, `python3 -c`, `node -e`). Use the Edit tool. For a one-off script, Write it to a file and run the file.
- **Never write temp files to pass as CLI arguments.** Pass multiline strings directly in the Bash command. No `/tmp/pr-body.txt`, no `/tmp/commit-msg.txt` — just inline the content.
- **For multiline CLI arguments (commit messages, PR bodies, etc.), just use regular multiline strings.** Never use `cat <<'EOF'` heredoc wrappers — just write the string directly with literal newlines inside quotes. A one-line `<<<` here-string is allowed.
- **Never append `2>&1` to commands.** The Bash tool already returns stderr.
- **Never use `$()` or backtick command substitution in Bash commands.** The shell runs both inside double quotes too: a commit message or PR body that contains backticks or `$(` goes in single quotes, or escapes them (`` \` ``, `\$(`).
- **Never chain commands with `&&`, `||` or `;`, a newline between commands, or a `for`/`while`/`if` block.** Always run each command as a separate Bash tool call (e.g. `git add` and `git commit` must be separate calls). A pipe (`| head`, `| grep`) is fine.
- **Quote globs passed to grep:** `--include='*.ts'`, never `--include=*.ts` — zsh aborts with "no matches found".
