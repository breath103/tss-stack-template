# API errors are typed codes; messages live on the frontend

The backend never writes a human-readable error message. An API error is a member of the
discriminated union `ApiErrorBody` (`packages/backend/src/types/api-error.ts`): a `type` code plus
the data a message needs. The response body is `{ error: { type: "...", ...data } }`.

The frontend owns the text: `packages/frontend/src/lib/api-error-message.i18n.json` holds one
entry per `type` (en + ko), and `useApiErrorMessage()` renders a caught error, substituting the
body's fields for `{field}` placeholders. The catalog is typed as
`Record<ApiErrorBody["type"], string>`, so adding a code without its message fails the typecheck.

Why: the message is UI copy. It must be translated, it changes with the screen it sits on, and a
wording change should never be a backend deploy. A code is also what a caller branches on — a
string compare against English prose breaks the first time someone edits the sentence.

## Adding an error

1. Add the member to `ApiErrorBody`, carrying the values the message will show.
2. Throw it: `throw new ApiError(404, { type: "project_not_found", projectId })`.
3. Add the `en` and `ko` text to `api-error-message.i18n.json`.
4. Show it with `useApiErrorMessage()` — never `error.message`.

```ts
// ❌ Wrong — English prose on the server, no code to branch on, untranslatable
throw new HTTPException(404, { message: `Project ${projectId} not found` });

// ✅ Right — a code plus its data; the frontend writes the sentence
throw new ApiError(404, { type: "project_not_found", projectId });
```

```tsx
// ❌ Wrong — renders whatever the server said
setError("root", { message: error instanceof Error ? error.message : String(error) });

// ✅ Right
const errorMessage = useApiErrorMessage();
setError("root", { message: errorMessage(error) });
```

`local/no-http-exception-message` (oxlint, backend `src/**`) rejects `new HTTPException(_, { message })`.
