# Test file names must match subject file names

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
