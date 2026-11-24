---
topic: Scripts and tests
order: 40
---

# When you add a unit test, name the file after the source it tests (foo.ts → __tests__/foo.test.ts).

Unit test files must be named after the source file they test: `foo.ts` → `__tests__/foo.test.ts`. Don't split tests for a single source file across multiple test files.

```
# ✅ Correct
src/lib/memory-to-docx.ts         → src/lib/__tests__/memory-to-docx.test.ts
src/lib/onedrive.ts               → src/lib/__tests__/onedrive.test.ts
```

```
# ❌ Wrong — split across multiple files
src/lib/memory-to-docx.ts         → src/lib/__tests__/memory-to-docx.test.ts
                                    src/lib/__tests__/memory-to-docx-html.test.ts
```
