/**
 * Every structured API error, as the `error` field of a non-2xx body: `{ error: ApiErrorBody }`.
 * A discriminated union on `type` plus the data a message needs — never the message itself. The
 * frontend owns the human-readable text, keyed by `type` (`lib/api-error-message.ts`), so it is
 * translated and a wording change never touches the server.
 */
export type ApiErrorBody =
  | { type: "invalid_query_parameters" }
  | { type: "invalid_request_body" }
  | { type: "internal_server_error" };
