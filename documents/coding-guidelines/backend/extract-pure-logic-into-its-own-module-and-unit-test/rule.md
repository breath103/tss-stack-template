---
topic: Repositories and services
order: 100
---

# When a handler or repo contains branching logic that needs no database, move it to its own module and unit-test it.

Anytime you find yourself writing logic that:

1. doesn't touch the DB / HTTP / S3 / external state, and
2. has more than one branch or non-trivial transformation,

**extract it into its own module and write unit tests.** Don't leave it inline inside a route handler, repo method, or service — those are integration surfaces and you can't (cheaply) hammer all the branches there.

The cost of extraction is one file. The cost of NOT extracting is that the only way to verify the logic is a slow integration test that runs the full stack — which means it doesn't get tested at all and silently regresses three PRs later.

**Examples in the codebase:**

| Module | What it isolates | Tests |
|--------|------------------|-------|
| `packages/backend/src/tools/oauth2.ts` | OAuth2 authorize-URL / token-exchange request shaping. No network. | `oauth2.test.ts` |
| `packages/backend/src/tools/tool-interface.ts` | Zod `toolInterface` validation of method params/returns. | `tool-interface.test.ts` |

**Test shape — keep it simple.** One `describe()` per behavioral group, each `it()` is a single assertion:

```ts
describe("oauth2 — authorizeUrl", () => {
  it("encodes the redirect_uri", () => {
    const url = authorizeUrl({ endpoint: "https://x/auth", clientId: "c", redirectUri: "https://a/b?c=d" });
    assert.match(url, /redirect_uri=https%3A%2F%2Fa%2Fb%3Fc%3Dd/);
  });
});
```

Don't pile setup/mocking around it. If the module needs setup to test, it's not pure — push the impure parts up to the caller and re-extract the pure core.

**Anti-pattern — logic inside a service method, untested:**

```ts
// ❌ TZ math hidden inside a route handler — only reachable via HTTP
route("/api/tasks/search", "GET", {
  handler: async ({ query, c }) => {
    let fromUtc: Date | undefined, toUtc: Date | undefined;
    if (query.createdAt) {
      // ... 30 lines of timezone resolution, DST handling, regex parsing ...
    }
    return await tasksRepo.search(user.id, { query: query.q, createdAfter: fromUtc, createdBefore: toUtc });
  },
}),
```

**Right pattern — pure module, unit-tested, called from the handler:**

```ts
// ✅ a pure module owns the TZ math; the route just reads the result
const filter = parseCreatedAtQuery(query.createdAt);
return await tasksRepo.search(user.id, {
  query: query.q,
  createdAfter: filter?.from ? new Date(filter.from.utcMs) : undefined,
  createdBefore: filter?.to ? new Date(filter.to.utcMs) : undefined,
});
```

The trigger isn't "this code is complex." The trigger is "this code can be tested without a server running." If the answer is yes, extract it.
