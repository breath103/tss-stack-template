# Prefer discriminated unions over optional fields

Use discriminated unions (tagged unions) instead of optional fields when values are mutually exclusive. This gives exhaustive type checking and avoids impossible states.

```typescript
// ✅ Correct - discriminated union, no impossible states
type TaskResult =
  | { type: "success"; output: string }
  | { type: "error"; output: string; error: string };
```

```typescript
// ❌ Wrong - optional fields allow impossible states
type TaskResult = {
  success: boolean;
  output: string;
  error?: string;  // can exist when success=true — meaningless
};
```
