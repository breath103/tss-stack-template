# Scripts: wrap every entry-point body in `main()`, never use top-level `await`

Every `*.ts` under `packages/backend/scripts/` and `scripts/` wraps its body in a `main()` function. Async scripts end with `main().catch(...)`; sync scripts just call `main()`. Top-level `await` in entry-point scripts mixes initialization with execution flow, buries error handling, and makes error exit codes non-obvious.

```ts
// ✅ Correct — async script
async function main() {
  const client = createServiceClient();
  // ...
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

```ts
// ✅ Correct — sync script
function main(): void {
  const r = spawnSync("docker", [...], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

main();
```

```ts
// ❌ Wrong — top-level await, no error handler
const client = createServiceClient();
await doStuff(client);
// crashes silently with exit code 0 on rejection
```
