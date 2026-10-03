# Deployment

- **CI deploys automatically on every push to `main`.** Other branches run checks only — no per-branch AWS stack. Never deploy manually.
- **Never use `--squash` when merging PRs.** Use `gh pr merge` without `--squash` (merge commit).

## Build and dependency caching

CI compiles the backend once (`pack-build.ts`), restores its Lambda dependency
cache, and deploys with `--skip-build`. The deployment script must not rebuild
after the cache is restored because rebuilding deletes `dist/`. CDK uses
`--method direct` with rollback enabled to avoid creating an intermediate
CloudFormation change set.

`packages/backend/package-lock.deploy.json` locks the standalone Lambda package
for linux-x64. After changing backend dependencies, refresh it with:

```bash
./packages/backend/scripts/pack-build.ts
./packages/backend/scripts/pack-install.ts --update-lock
```

Commit the deployment lockfile with the dependency change. This includes a
template merge that changes backend dependencies. The `check` job runs
`pack-verify.ts` on every PR, so a stale lockfile fails before merge rather than
at deploy. Normal packaging runs
`npm ci` against that lock. It describes the production package only; the root
workspace lockfile continues to describe the development/check environment.

Both dependency caches include the runner platform and Node version. The Lambda
cache also includes the deployment lockfile, the backend manifest, and the
packaging scripts. Compiled workspace code is rebuilt on every run; only its
installed dependencies are cached. `pack-verify.ts` checks the packaged
manifest, lockfile, and installed versions agree before every deployment. npm's
download cache is restored only when an installation is needed.

## Deployment verification

After every backend deployment, CI reads the Function URL from the stack outputs
and checks the health endpoint and an anonymous `get-session` call. The URL
appears in the workflow summary.

## Branch cleanup

Deleting a branch removes its backend stack, log group, SSM routing parameter,
and frontend prefix through `cleanup.yml`. The `main` log group is retained.
Deployment and deletion share a concurrency lock per branch.
