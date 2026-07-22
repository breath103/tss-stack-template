# User-facing pages live in the frontend app — the backend never renders HTML

If a route's response is meant for a human in a browser (consent screens, confirmation pages, error pages), it belongs in `packages/frontend` as a real route: the backend redirects there with the needed data in the querystring. The frontend app already has the session, the router, the design system, and i18n — a backend-rendered HTML string has none of them and duplicates all of them badly.

The same boundary applies to the submit path: an in-app page talks back through a typed `route()` endpoint (`api.fetch` + JSON), not a native `<form>` POST with hidden-input forwarding. Reserve raw form-encoded endpoints for wire protocols that external clients require (e.g. the OAuth `/token` endpoint).

✅ `GET /api/oauth/authorize` → 302 to `/oauth/consent?client_name=…&scopes=…`; the page POSTs JSON to `route("/api/oauth/consent")` and navigates to the returned URL.

❌ `c.html(`<form method="post" action="/api/oauth/authorize">…`)` rendered from a Hono handler.
