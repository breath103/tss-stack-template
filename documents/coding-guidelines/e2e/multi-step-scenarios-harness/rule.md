# Multi-step scenarios — `harness()`

Plain `assert.equal(...)` stops on the first failure. For anything with multiple independent checks, wrap the body in `harness()`:

```ts
import { harness } from "./_helpers.js";

export default harness(async ({ step, stepOrExit, log, page, request }) => {
  const r = await request.get("/api/things");
  stepOrExit("GET /api/things → 200", r.status() === 200);  // throws on fail

  const list = await r.json();
  step("array shape", Array.isArray(list), `n=${list.length}`);   // records, continues

  log("(driving long task — this takes ~30s)");
  // ...
}, { timeoutMs: 5000 });
```

- **`step(name, ok, detail?)`** — records pass/fail, continues regardless. Use for independent checks.
- **`stepOrExit(name, ok, detail?)`** — records, throws if `ok === false`. Use when subsequent steps depend on this one. Doesn't narrow TypeScript types (TS limitation on arrow-function method types) — use an explicit `if (!x) throw …` after it when you need narrowing.
- **`log(line)`** — dim status line for progress.
- **`timeoutMs`** — bounds the WHOLE scenario. Default 3000ms. Set it higher only when the scenario legitimately needs it (file uploads, long polls). Per-action waits live INSIDE the scenario.

`harness` records pass/fail per step, prints a summary, and throws if any step failed. The runner converts that into a `FAIL` line and non-zero exit.
