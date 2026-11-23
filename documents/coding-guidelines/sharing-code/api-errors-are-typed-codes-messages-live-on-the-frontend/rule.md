---
topic: Errors and fallbacks
order: 30
---

# When the backend rejects a request, throw an ApiError with a typed code and no user-facing wording.

The backend never writes a human-readable error message. An API error is a member of the
discriminated union `ApiErrorBody` (`packages/backend/src/types/api-error.ts`): a `type` code plus
the data a message needs. The frontend owns the text
(`sharing-code/show-api-errors-with-useapierrormessage`).

Why: the message is UI copy. It must be translated, it changes with the screen it sits on, and a
wording change should never be a backend deploy. A code is also what a caller branches on.

## Adding an error

1. Add the member to `ApiErrorBody`, carrying the values the message will show.
2. Throw it: `throw new ApiError(409, { type: "billing_account_already_member" })`.
3. Add the `en` and `ko` text to `api-error-message.i18n.json`.

Lint rejects a message on the exception and the typecheck rejects a code with no catalog entry.

A domain error that an agent also reads over JSON-RPC (`ToolNotConnectedError`) keeps its English
`message` for that channel and carries a typed `reason` for the REST response.
