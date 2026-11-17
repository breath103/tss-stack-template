---
name: dev-keychain
description: Store and use development-side secrets (third-party API keys, narrowly scoped cloud access keys) in development.keychain-db, the encrypted macOS keychain committed at the repo root. Use when a script, a skill or an agent session needs a secret to reach an external service from a laptop; when the user asks to add, store, rotate or list a dev secret, API key or token; when a command needs a credential that is not in .env; or when keychain_exec, keychain_set, keychain_list, keychain_create, DevKeychain or development.keychain-db come up, including a keychain password dialog or "could not be found in the keychain".
---

# Development keychain

`development.keychain-db` at the repo root is a macOS keychain file, committed to git and
encrypted with one password the team shares out of band. It holds the secrets a developer
or an agent session needs on a laptop: an analytics read key, a logs/traces token, a cloud
access key scoped to one dev script.

Every read and write goes through `/usr/bin/security`. When the keychain is locked, macOS
shows its own password dialog to the user; the password and the values never pass
through the agent. It locks after 7 days idle and on logout or reboot. Reading it does
not change the file, so `git status` stays clean; only `keychain_set` / `store` change it.

## Rules

1. **Never print a value.** No `keychain_exec.ts NAME -- printenv`, no `echo $NAME`,
   no `env`, no logging what `secrets()` returned, no writing it to a file. To check a
   key works, run the real command that uses it.
2. **Never ask the user to paste a secret into chat.** Run `./scripts/keychain_set.ts <NAME>`;
   macOS collects the value in a hidden-input dialog.
3. **Never call `security` on `development.keychain-db` by hand**, including
   `security unlock-keychain`: the macOS dialog is the only place the password is typed.
   `scripts/keychain/dev-keychain.ts` (`DevKeychain`) is the only code that calls `security`.
4. **An item is named after the environment variable it becomes:** `^[A-Z][A-Z0-9_]*$`,
   e.g. `ANALYTICS_API_KEY`, `DEPLOY_AUDIT_AWS_SECRET_ACCESS_KEY`.
5. **Commit `development.keychain-db` after every `keychain_set`.** That commit is how
   teammates and other worktrees get the item.

## Commands

```bash
./scripts/keychain_list.ts                                # item names, never values
./scripts/keychain_exec.ts <NAME>... -- <command> [args]  # run a command with the items as env vars
./scripts/keychain_set.ts <NAME>                          # store or replace an item; the value is typed into a macOS dialog
./scripts/keychain_create.ts                              # once per project, when the file does not exist
```

Run them from the repo root. A command that waits on the user is waiting on a macOS dialog
(the value prompt titled "Development keychain", or the keychain's unlock prompt). Tell the
user to look for it, possibly behind other windows; do not kill and retry.

## Using a secret

### From the shell, or in a skill's instructions: `keychain_exec.ts`

```bash
./scripts/keychain_exec.ts ANALYTICS_API_KEY -- sh -c 'curl -s -H "Authorization: Bearer $ANALYTICS_API_KEY" https://…'
```

- **Single-quote the `sh -c` body.** Double quotes let your shell expand
  `$ANALYTICS_API_KEY` to an empty string before `keychain_exec` runs.
- A tool that reads its own variable name: rename inside the child,
  `sh -c 'TOOL_API_KEY=$ANALYTICS_API_KEY ./node_modules/.bin/tool …'`.
- A tool that already reads the item's name needs no shell:
  `./scripts/keychain_exec.ts GITHUB_TOKEN -- gh api /user`.
- Several items: `./scripts/keychain_exec.ts A_KEY B_KEY -- <command>`.

A skill for a service (logs, analytics, a vendor API) names the item it needs and writes
every call through `keychain_exec.ts` like this, so the agent never handles the key.

### From a TypeScript script: `DevKeychain`

```ts
import { DevKeychain } from "<relative path>/scripts/keychain/dev-keychain.js";

const { ANALYTICS_API_KEY } = new DevKeychain().secrets(["ANALYTICS_API_KEY"]);
```

Hand the values to an SDK client or a child process's `env`, never to a log. When a run
may not need the service at all (a cache hit), give the SDK a credential *provider* so
the keychain is unlocked only on the first real call:

```ts
new S3Client({ credentials: () => Promise.resolve(loadKey()) }); // loadKey() calls secrets()
```

A script that mints a credential itself (creates an IAM key, say) writes it with
`new DevKeychain().store(NAME, value)`, never printing it, and tells the user to commit
`development.keychain-db`.

## Adding a secret

1. Mint the narrowest credential the provider offers: read-only scopes, one bucket prefix,
   one project. The ciphertext stays in git history forever, so a cracked password must
   cost as little as possible.
2. `./scripts/keychain_set.ts <NAME>`, with `<NAME>` the environment variable the consumer
   reads. Tell the user a dialog is waiting for the value; a locked keychain then asks for
   its password too.
3. `./scripts/keychain_list.ts` shows the new name.
4. Commit `development.keychain-db`.
5. Write the consumer (a skill's `keychain_exec.ts` call or a script's `DevKeychain`), and
   name the item it needs there.

**Rotating:** mint the new credential, `keychain_set.ts <NAME>` again (it replaces the
item), commit, then revoke the old one at the provider. **Retiring:** revoke at the
provider. Nothing removed from the file leaves git history, so revocation is the only
real removal.

## Belongs here, or not

| Secret | Where |
|---|---|
| A key a developer or agent uses from a laptop to look at or operate an external service | here |
| A key the deployed app reads at runtime | the app's own env / secret config, not here |
| Anything CI needs | not here: CI runs on Linux, which has no `security` |
| One person's own credentials (their `AWS_PROFILE`, a personal login) | their machine, not a shared file |

## First-time setup

A project made from the template has no `development.keychain-db` until someone runs
`./scripts/keychain_create.ts`. macOS asks for the new password: make it long, since it is
the only protection of a file in git, and share it with the team through a password
manager. Commit the file. Every item's account is `<tss.json project>-dev`, so renaming
`project` makes the existing items unreadable.

A new teammate or a new machine needs no setup: pull, run a command, type the password
into the dialog.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `development.keychain-db does not exist` | The project never created one | `./scripts/keychain_create.ts`, commit |
| `SecKeychainSearchCopyNext: The specified item could not be found in the keychain.` (exit 44) | The name is not in this branch's file | `keychain_list.ts`; then `keychain_set.ts <NAME>`, or merge the branch that added it |
| `"x" is not an item name` | Lowercase or a dash in the name | Use the environment-variable form |
| `User canceled. (-128)` | The dialog was dismissed | Run it again |
| `User interaction is not allowed.` | No desktop session (SSH, a headless runner) to show the dialog | Run it in the Mac's logged-in desktop session |
| `spawnSync security ENOENT` | Not macOS | The keychain is macOS only |
| Merge conflict on `development.keychain-db` | It is binary; two branches each set an item | Take one side (`git checkout --theirs development.keychain-db`), then `keychain_set.ts` the other side's items again |
| An untracked `.fl` + 8 hex characters file at the root | macOS's lock file beside the keychain | Already gitignored (`/.fl????????`); leave it |
