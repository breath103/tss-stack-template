# Default to functional pipelines with lodash for data transformations

Same rule as backend (see `backend/default-to-functional-pipelines-with-lodash-every-transformation/rule.md`). When a component/hook is shaping data — flattening a tree to rows, grouping children by parent, fanning a record out across keys, building an `id → row` lookup, computing a per-key min/max — reach for `chain` / `flatMap` / `groupBy` / `keyBy` / `min` / `max` first. Hand-rolled `for` loops with `let acc = []` accumulators hide the data flow and are the most common source of "what is this code doing" review comments on this codebase.

`for` is reserved for early-exit / side-effect loops. Everything that produces a derived value goes through a pipeline.

**Import lodash from `"lodash"` (CJS), not `"lodash-es"`.** `lodash-es` declares `"sideEffects": false`, which lets Rollup tree-shake out the prototype-mixin side effect that makes `chain(...).groupBy(...)` work — in prod it crashes with `"groupBy is not a function"`. CJS `lodash` has no such declaration, so chain works. The whole codebase uses one default import (`import _ from "lodash"`) and calls methods on it; that way you can switch between standalone (`_.groupBy(...)`) and chain (`_.chain(...)…`) freely without the import rule changing under you.

```ts
// ✅ Correct
import _ from "lodash";
const tagsByTask = _.chain(taskTags).groupBy("task_id").value();
const grouped = _.groupBy(taskTags, "task_id");
```

```ts
// ❌ Wrong — chain from lodash-es. Crashes in prod with
//    "TypeError: chain(...).groupBy is not a function"
import { chain } from "lodash-es";
```

```ts
// ❌ Wrong — imperative accumulator
const tagsByTask = new Map<string, AstraTaskTag[]>();
for (const tg of taskTags) {
  if (!tagsByTask.has(tg.task_id)) tagsByTask.set(tg.task_id, []);
  tagsByTask.get(tg.task_id)!.push(tg);
}
```
