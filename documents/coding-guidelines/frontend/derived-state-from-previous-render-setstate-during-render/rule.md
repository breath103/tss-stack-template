---
topic: Hooks and state
order: 40
---

# When state must follow a prop's previous value, call setState during render behind a guard, not in useEffect.

When you need a state that mirrors a prop's last non-empty value (route-derived dialog id, "previous" tab, etc.), set it **during render** with a guard. Calling `setState` inside `useEffect` for derived state is flagged by `react-hooks/set-state-in-effect` and triggers a cascading render — React's recommended pattern is the inline `if`-then-`setState` guard.

```tsx
// ✅ Correct — derived state set during render
const [cachedId, setCachedId] = useState(memoryId);
if (memoryId !== undefined && memoryId !== cachedId) {
  setCachedId(memoryId);
}
```

```tsx
// ❌ Wrong — useEffect for derived state (lint error: react-hooks/set-state-in-effect)
const [cachedId, setCachedId] = useState(memoryId);
useEffect(() => {
  if (memoryId !== undefined) setCachedId(memoryId);
}, [memoryId]);
```

React handles the during-render `setState` correctly: it discards the current render and immediately re-renders with the new state, so callers see consistent values without the extra effect-driven render.
