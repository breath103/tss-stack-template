---
topic: Errors and fallbacks
order: 60
---

# When the API returns 401, don't catch or retry it in feature code; api.fetch signs the user out.

`api.fetch` refreshes the JWT once on a 401. A second 401 fires `unauthenticated$`, which
`AuthContext` turns into a sign-out and a redirect to `/login`.

- Don't catch a 401 inside a feature component and handle it there (a toast, a retry). The
  session is gone, so every other endpoint keeps answering 401 and the user is stuck.
- A long-lived background client (a websocket signer, a polling fetcher) that calls `api.fetch`
  in a retry loop must end that loop when its route unmounts — never keep retrying past sign-out.
