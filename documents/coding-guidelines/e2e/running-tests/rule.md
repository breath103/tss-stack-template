# Running tests

```bash
./scripts/dev.ts start       # dev server must be up
./scripts/e2e.ts start       # headless Chrome (auto-starts via runner if not)
npm run e2e                  # list scenarios
npm run e2e <name>           # run one
```

**Before running e2e, dev server MUST be up.** Run `./scripts/dev.ts status` first; if it isn't `ready`, start it. The Chrome instance auto-starts via the runner if not already running.
