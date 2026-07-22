---
requires: entity-repository
---

# Render-isolation tests

Every list whose row count scales with user data needs an e2e test using `useRenderCount` (from `@/dev/useRenderCount`):

- **Required:** editing one row does NOT bump the parent list/page's render count (proves per-instance subscription holds).
- **Nice-to-have:** editing field A on one row bumps only the cell rendering field A (proves per-cell memo if added).

See `e2e/tasks-no-rerender-on-edit.ts` for the template. See `documents/coding-guidelines/frontend/optimize-the-dimension-that-scales-with-user-data/rule.md` for the underlying rule.