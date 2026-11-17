# Development keychain — dev-side secrets, committed and encrypted

## Summary

A macOS keychain file, `development.keychain-db`, lives at the repo root and holds the
secrets a developer or an agent session needs on a laptop: an analytics read key, a logs
token, a cloud access key scoped to one dev script. The file is encrypted with one password
the team shares out of band. A script reads an item through `/usr/bin/security`; when the
keychain is locked, macOS shows its own password dialog. The password never passes through
the script or the agent, and a value reaches a command only as an environment variable.

How to use it is the `dev-keychain` skill (`.claude/skills/dev-keychain/SKILL.md`).

## Motivation

An agent session cannot answer "show me this from <service>" without a credential, and the
usual places for one are all wrong: a plaintext token in the home directory is per machine,
unencrypted and set up again on every new machine; a key pasted into chat lands in the
transcript; the app's `.env` files are for what the deployed app reads, not for a
developer's read access. Downstream, the first two uses were a PostHog read key (queried
through PostHog's own CLI from a skill) and an S3 key scoped to one bucket prefix for
database dumps.

## What it looks like

```bash
./scripts/keychain_create.ts                  # once per project; macOS asks for a new password
./scripts/keychain_set.ts ANALYTICS_API_KEY   # macOS dialog with a hidden field for the value
./scripts/keychain_list.ts                    # item names, never values

# Run a command with the named items in its environment
./scripts/keychain_exec.ts ANALYTICS_API_KEY -- sh -c 'curl -s -H "Authorization: Bearer $ANALYTICS_API_KEY" …'
```

Locked keychain → macOS dialog → the developer types the password → the command runs.
Unlocked → no dialog.

## Decisions

### D1 — A real macOS keychain file, at `development.keychain-db` in the repo root

`security create-keychain -P <path>` makes a self-contained encrypted file, and
`security find-generic-password -w -s <name> <path>` reads one item from it. Locking, the
password dialog and the unlock timeout are all macOS's; the repo adds no crypto of its own.
The file is not added to the user's keychain search list, so it does not show up in other
apps. Reading, locking and unlocking do not change the file's bytes, so using the keychain
leaves `git status` clean; only `create` and `set`/`store` change it.

### D2 — Locks after 7 days idle, not on sleep

macOS's default for a new keychain file is lock-on-sleep plus a 5-minute idle lock, which
asks for the password many times a day. `keychain_create.ts` replaces it with
`security set-keychain-settings -u -t 604800`. The setting is stored in the file, so it is
the same on every machine. Logout or a reboot still locks it.

### D3 — Secrets reach a command as environment variables

There are four scripts (`keychain_create`, `keychain_set`, `keychain_list`,
`keychain_exec`) and no `get`. An item is named after the environment variable it becomes,
and `keychain_exec.ts <NAME>… -- <command>` runs the command with those set, so a key never
has to be printed into a terminal or an agent transcript to be used. `set` collects the
value in a macOS hidden-input dialog: it works whether the developer or the agent launches
the command, and the agent never sees what was typed. Scripts use `DevKeychain.secrets()`
and hand the values straight to an SDK client; `DevKeychain.store()` writes a credential a
script minted itself.

### D4 — Every item's account is `<tss.json project>-dev`

`security add-generic-password` requires an account. Deriving it from `project` keeps it
stable across machines without a new config key; renaming `project` orphans the items.

### D5 — The template ships the scripts and the skill, not the file

A keychain file is bound to its password, so each project creates its own with
`keychain_create.ts`. `DevKeychain` fails with that instruction when the file is missing:
`security` would otherwise read a missing file as an empty keychain and report every item
as "could not be found".

## Key files

- `scripts/keychain/dev-keychain.ts` — `DevKeychain`, the only code that calls `security`
- `scripts/keychain_create.ts`, `keychain_set.ts`, `keychain_list.ts`, `keychain_exec.ts`
- `.claude/skills/dev-keychain/SKILL.md` — how to use and extend it
- `.gitignore` — `/.fl????????`, the lock file macOS drops beside a keychain file

## Risks

- **The ciphertext is in git, for everyone with repo access, forever.** Its protection is
  the password's strength; use a long one. Removing an item does not remove it from
  history, so a leaked or retired key is revoked at the provider, not here.
- **Keys should be the narrowest the provider offers** (read-only scopes, one prefix), so
  the worst case of a cracked keychain is small.
- **Binary merges.** Two branches that each `set` an item conflict with no merge possible:
  take one side and `set` the other item again.
- **macOS only.** CI never touches it.
- **No Touch ID.** A keychain file's unlock dialog is password-only; biometrics exist only
  for the per-user data-protection keychain, which cannot be committed.
