import { createHash } from "node:crypto";
import { stringify } from "safe-stable-stringify";

export const SESSION_HASH_COOKIE = "session_hash";

/**
 * Identifies what the frontend caches from `get-session`. get-session writes it
 * to a cookie, and the session middleware tells the frontend to reload when the
 * cookie no longer matches. `pick` narrows the hash to part of the session.
 */
export function sessionHash<S>(session: S, pick: (session: S) => unknown = s => s): string {
  return createHash("sha256")
    .update(stringify(pick(session)) ?? "")
    .digest("base64url")
    .slice(0, 16);
}
