# Default to functional pipelines with lodash — every transformation, every time

Any time you're shaping data — collecting, grouping, summing, deriving a per-key aggregate, fanning a record out and recombining, building an "id → row" lookup, computing min/max over a derived field — reach for `lodash-es` first. Hand-rolled `for` loops with mutable accumulators (`Map`s you `.push` into, `Set`s you `.add` to inside conditionals, `let minX = null` you reassign) are noisy, easy to get wrong, and hide the data flow under the control flow. A single `chain(...)` pipeline reads top-to-bottom and shows the transformation as data, not as procedure.

Use this rule literally — every time you find yourself writing a `for` / `while` over an array to build another array, object, or scalar, stop and ask: is this a `map`, `flatMap`, `filter`, `groupBy`, `keyBy`, `partition`, `min`, `max`, `minBy`, `maxBy`, `sumBy`, `meanBy`, `uniqBy`, `sortBy`, `orderBy`, `chunk`, or `zip`? If yes (it almost always is), use the lodash function. If you have multiple steps, wrap them in `chain(...).....value()`.

Always import named members from `lodash-es`. Never default-import.

```typescript
// ✅ Correct — pipeline reads as a derivation
import { chain, sumBy } from "lodash-es";

const dailyCosts = chain(rows)
  .groupBy((r) => new Date(r.created_at).toISOString().slice(0, 10))
  .map((dayRows, date) => ({ date, total: sumBy(dayRows, "cost_usd") }))
  .sortBy("date")
  .value();

// ✅ Correct — fan-out + group + per-group min/max
const goalDates = chain(tasks)
  .flatMap((t) => ancestorChain(anchorOf(t)).map((g) => ({ g, start: t.start, end: t.end })))
  .groupBy("g")
  .toPairs()
  .map(([g, xs]) => [g, {
    start: min(compact(xs.map((x) => x.start))) ?? null,
    end:   max(compact(xs.map((x) => x.end)))   ?? null,
  }])
  .value();
```

```typescript
// ❌ Wrong — imperative accumulator hides the transformation
const grouped = new Map<string, typeof rows>();
for (const r of rows) {
  const date = new Date(r.created_at).toISOString().slice(0, 10);
  if (!grouped.has(date)) grouped.set(date, []);
  grouped.get(date)!.push(r);
}

// ❌ Wrong — manual min over a sparse list
let minStart: string | null = null;
for (const t of tasks) {
  if (t.start && (minStart === null || t.start < minStart)) minStart = t.start;
}
```

Three usage notes:

1. **`chain` types vs. ESLint.** `chain(arr).map("x").compact().min().value()` is sometimes typed as non-nullable (the `.min()` `undefined` case is lost inside the wrapper), which makes ESLint reject the necessary `?? null`. When that happens, drop chain for that final reduction and call the standalone function directly: `min(compact(arr.map((x) => x.field))) ?? null`. The pipeline above the reduction can stay in `chain`.
2. **`Map` for lookups, lodash for transforms.** `keyBy` / `groupBy` return `Dictionary<T>` which TypeScript treats as having every string key (no `undefined` for missing entries) — the runtime undefined will produce ESLint "unnecessary-condition" errors on every `dict[id]?.x ?? null`. Use a real `new Map(...)` for `id → row` lookups (its `.get` is properly typed `T | undefined`); reserve lodash for the transformation pipelines.
3. **`for` is reserved for early-exit / side-effect loops.** A `for` / `while` with `return` / `break` mid-iteration is fine — `Array.prototype.forEach` can't bail. Same for loops whose body is exclusively a side effect (issuing requests, mutating an outer state machine). Everything else goes through lodash.
