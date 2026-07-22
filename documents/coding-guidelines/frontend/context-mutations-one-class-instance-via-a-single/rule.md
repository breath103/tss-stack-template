---
requires: entity-repository
---

# Context mutations: one class instance via a single `useMemo`

When a feature provider exposes mutation methods (createX, updateX, deleteX,
…) through context, do NOT define each as its own `useCallback`. Define
**one class** with the methods and create the singleton via a single
`useMemo(() => new XMutations(), [])`. Consumers call `mutations.foo(...)`.

Per-method `useCallback` produces N closures, N memo dependencies, and N
re-binding hazards every render — and it makes the surface harder to test
or stub. A class instance is one allocation, one stable reference, and a
named unit you can grep for, mock, or extend.

```ts
// ✅ Correct — one class, one useMemo, single stable identity
class AstraMutations {
  async createGoal(p: { title: string; parent_id?: string | null }) {
    const { data } = await api.fetch("/api/astra/goals", "POST", { body: { ... } });
    return data.goal;
  }
  async updateGoal(id: string, updates: { title?: string; parent_id?: string | null }) { ... }
  async deleteGoal(id: string) { ... }
  // ...
}

const MutationsContext = createContext<AstraMutations | null>(null);

export function AstraRepositoryProvider({ children }) {
  const mutations = useMemo(() => new AstraMutations(), []);
  return <MutationsContext.Provider value={mutations}>{children}</MutationsContext.Provider>;
}
```

```ts
// ❌ Wrong — N useCallbacks for the same logical surface
const createGoal = useCallback(async (...) => { ... }, []);
const updateGoal = useCallback(async (...) => { ... }, []);
const deleteGoal = useCallback(async (...) => { ... }, []);
// ...
const value = useMemo(() => ({ createGoal, updateGoal, deleteGoal, ... }), [createGoal, updateGoal, deleteGoal, ...]);
```