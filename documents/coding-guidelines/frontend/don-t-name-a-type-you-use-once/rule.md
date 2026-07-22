# Don't name a type you use once — inline it

A `type`/`interface` that has exactly one reference earns nothing. It splits the shape from its use, adds a name to grep past, and reads like the start of an abstraction that never comes. Inline it at the single callsite instead.

This bites two ways in practice:

- **A `Props` interface for a component with one (or a couple of trivial) props.** Don't declare `interface FooProps { taskId: string }` just to write `function Foo({ taskId }: FooProps)`. Inline the object type.
- **A type alias that just re-indexes something that already has a name.** `type HistoryEntry = ApiRoutes["/api/tasks/:id/history"]["GET"]["response"][number]` reconstructs an element type from a route shape. If the element already has a named type (a DB row, an exported response type), import that. If it doesn't, index inline at the one place you need it — don't mint a top-level alias for a single use.

```tsx
// ❌ Wrong — named interface + named alias, each used exactly once
type HistoryEntry = ApiRoutes["/api/tasks/:id/history"]["GET"]["response"][number];

interface ChangeLogSectionProps {
  taskId: string;
}

export function ChangeLogSection({ taskId }: ChangeLogSectionProps) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  // ...
}
```

```tsx
// ✅ Correct — inline the one-off prop type; import (or inline) the entry type
import type { TaskHistory } from "@backend/types/database";

export function ChangeLogSection({ taskId }: { taskId: string }) {
  const [entries, setEntries] = useState<TaskHistory[] | null>(null);
  // ...
}
```

Promote a shape to a named type the moment it has a **second** reference — not before. Same rule as "Don't add hypothetical optional props," applied to the type system: a name you use once is dead weight.
