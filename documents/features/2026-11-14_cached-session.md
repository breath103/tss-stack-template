# Cached session, reloaded on `x-session-stale`

## Summary

The frontend keeps the session in localStorage and paints from it immediately on every page load.
It calls `/api/auth/get-session` only when there is no cached entry, or when the backend says the
cache is out of date by adding an `x-session-stale` header to an API response. The session cookie
stays the truth; localStorage is only a cache of what `get-session` last returned.

## Motivation

Without a cache, every page load calls `get-session` (better-auth's `useSession`) and renders
nothing user-specific until it returns, although the session almost never changes. In a downstream
project a page refresh was 5,526 of about 87,800 API requests in a week, against 15 actual auth
changes. The page also waits one round-trip before it can show who is signed in.

A cache with a time-to-live trades that cost for a window in which a changed session (a new name,
a different user, a revoked role) is shown stale. The hash exchange below has neither cost: no
request when nothing changed, and the change reaches the frontend on the next API response.

## How it works

```
get-session ──► response body: the session
            └─► Set-Cookie: session_hash=<hash of the cached fields>

any API request ──► Cookie: session_hash=<what the frontend has cached>
                    middleware: hash(current session) !== cookie ?  → x-session-stale: 1

frontend: response has x-session-stale → call get-session once → new cache + new cookie
```

1. **The hash names what the frontend caches.** `sessionHash(session, pick?)`
   (`packages/backend/src/lib/session-hash.ts`) hashes the whole session `get-session` returns —
   the same object the frontend caches — into 16 base64url characters. A field added to the
   session later is covered without touching the hash. Pass `pick` to hash only part of it
   (`sessionHash(session, s => s.user)`), for example to ignore a field that changes on every
   request. It is not a secret and not an auth check: it only answers "is the copy in localStorage
   still the session this cookie resolves to?"
2. **`get-session` writes it.** A `customSession` plugin in `packages/backend/src/lib/auth.ts` sets
   the `session_hash` cookie (created with `createAuthCookie`, so it gets the same prefix, `Secure`
   and `SameSite` as the auth cookies) on every `get-session` response. The cookie and the cached
   body are always written by the same response, so they describe the same session.
3. **The session middleware compares.** For every cookie-authenticated request,
   `packages/backend/src/index.ts` hashes the session it just resolved and compares it with the
   cookie. Only on a mismatch does it add `x-session-stale: 1`. A missing cookie counts as a
   mismatch, so a browser that never had one reloads once and then has one.
4. **The frontend reacts.** `api-client.ts` reports the header through `setOnSessionStale`.
   `AuthProvider` (`packages/frontend/src/contexts/AuthContext.ts`) then calls `get-session` once.
   Concurrent stale responses share one in-flight reload, and responses whose request started
   before the last reload finished are ignored, because they were answered with the old cookie.
5. **Failure is safe.** A reload that fails while a session is cached leaves the user signed in on
   the cached session; the next API response signals again. A `401` clears the cache and the
   in-memory session. `signOut` clears the cache before it signs out, so the next page load can't
   paint the previous user.

### The cache entry

`packages/frontend/src/lib/session-cache.ts` stores `{ session, cachedAt }` under
`auth-session:v1` through `LocalStoredValue` (`modules/ui/src/lib/local-stored-value.ts`). Its zod
schema is checked against the backend `Session` type with `satisfies`, so a backend session change
fails the frontend type-check until the schema is updated. Anything that doesn't parse — an older
shape, a corrupt value — is evicted and treated as "no entry", which falls back to `get-session`.

## Extending the session

When you add a field to the session (a role, permissions, an impersonator via `customSession`):

1. Add it to the cache schema in `session-cache.ts`. The `satisfies` check makes this a compile
   error rather than something to remember. The hash covers it already, unless a `pick` was passed.
2. Bump the cache key (`auth-session:v1` → `v2`) only if old entries could still parse under the
   new schema with a wrong meaning. A new required field evicts old entries on its own.

The middleware only signals a change it can see on the request. For data that changes on the
server without the user doing anything (an admin revokes a role), the hash has to be computed from
the server's current state, not from the session cookie's cached payload — read the row in
`customSession` and in the middleware, as the downstream project does for permissions.

## What a page sees

- **First visit / signed out:** no entry → `AuthProvider` renders nothing until `get-session`
  returns, exactly as before.
- **Every later load:** paints immediately from the cache; no `get-session` request.
- **Session changed elsewhere** (other tab signed in as someone else, a dev login replaced the
  cookie): the old user is shown until the first API response, which carries `x-session-stale`;
  then the page re-renders with the new session. A page that makes no API call keeps the cached
  session until it does.

## Key files

- `packages/backend/src/lib/session-hash.ts` — `SESSION_HASH_COOKIE`, `sessionHash()`
- `packages/backend/src/lib/auth.ts` — `customSession` writes the cookie; exports `Session`
- `packages/backend/src/index.ts` — session middleware adds `x-session-stale`
- `packages/frontend/src/lib/session-cache.ts` — the localStorage entry
- `packages/frontend/src/contexts/AuthContext.ts` — `AuthProvider`, `useSession`, `getCurrentSession`
- `packages/frontend/src/lib/api-client.ts` — `setOnSessionStale`, `setOnUnauthenticated`
- `packages/frontend/src/lib/auth-client.ts` — `signOut` clears the cache

## Risks

- **A `pick` that leaves out a field the UI reads** makes that field go stale silently. With no
  `pick`, everything is covered; the rolling session refresh (`updateAge`) changes `expiresAt`, so
  it costs one extra `get-session` per refresh window.
- **Cross-origin cookies.** The hash cookie rides the same attributes as the auth cookie, so it
  works wherever auth does (including `SameSite=None` behind CloudFront).
- **A page with no API traffic** shows a stale session until its first request. Acceptable: the
  backend still authorizes every request from the cookie, so stale is only cosmetic.
