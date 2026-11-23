---
topic: Scripts and tests
order: 10
---

# When you add a script, name it snake_case with a domain prefix and make it runnable by its shebang.

A new script is one executable file named `<domain>_<command>.ts`, run directly by its shebang.

```
packages/backend/scripts/
├── db_start.ts
├── db_stop.ts
├── db_status.ts
├── db_shell.ts
├── db_reset.ts
├── db_migrate.ts
└── db_gen_types.ts
```

Unrelated commands never share one file behind a dispatcher (`db.ts start|stop|shell|migrate`).
Each file is its own greppable unit and the filename says which code runs.

Subcommands are right when they drive ONE long-lived thing through its lifecycle and share the
state they manage: `./scripts/dev.ts start|stop|status`.

Older kebab-case names (`build-types.ts`, `pack-install.ts`, `open-url.ts`) stay as they are.
Don't rename them, and don't add new ones in that style.
