---
topic: Scripts and tests
order: 40
---

# When you add a unit test, name the file after the source it tests (foo.ts → __tests__/foo.test.ts).

Unit test files must be named after the source file they test: `foo.ts` → `__tests__/foo.test.ts`. Don't split tests for a single source file across multiple test files.

```
# ✅ Correct
src/lib/task-to-csv.ts            → src/lib/__tests__/task-to-csv.test.ts
src/lib/slugify.ts                → src/lib/__tests__/slugify.test.ts
```

```
# ❌ Wrong — split across multiple files
src/lib/task-to-csv.ts            → src/lib/__tests__/task-to-csv.test.ts
                                    src/lib/__tests__/task-to-csv-escape.test.ts
```
