---
requires: entity-repository
topic: Data loading
order: 30
---

# When you change a persisted row from the frontend, write through repositoryWriter.

Edits to a loaded row go through the shared `repositoryWriter` (optimistic: patch the cache
first, roll back on failure), from the feature's mutations class in `contexts/*-mutations.ts`.
It is the last link of the path a row travels
(`frontend/load-and-render-persisted-data-through-the-repository`).
