---
topic: Errors and fallbacks
order: 40
---

# When the frontend shows an API error, word it with useApiErrorMessage(); never display the raw code or message.

An API error arrives as a `type` code plus the data a message needs, never as text
(`sharing-code/api-errors-are-typed-codes-messages-live-on-the-frontend`). The frontend owns the
text: `packages/frontend/src/lib/api-error-message.i18n.json` holds one entry per `type` (en + ko),
and `useApiErrorMessage()` renders a caught error, substituting the body's fields for `{field}`
placeholders.

Lint and the typecheck cover the backend half. Neither sees the frontend rendering the raw error,
so that half is yours:

```tsx
// ❌ Wrong — renders whatever the server said
setError("root", { message: error instanceof Error ? error.message : String(error) });

// ✅ Right
const errorMessage = useApiErrorMessage();
setError("root", { message: errorMessage(error) });
```
