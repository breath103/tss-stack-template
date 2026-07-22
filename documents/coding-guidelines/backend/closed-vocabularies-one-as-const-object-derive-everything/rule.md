# Closed vocabularies: one `as const` object — derive everything else

When a closed set of identifiers has any per-member data (a label, a
description, a config value), declare ONE `as const` object keyed by the
identifiers. The union type, the key list, and every lookup derive from it.
Never maintain a parallel tuple + record: two declarations of one vocabulary
drift the moment someone adds a member to only one of them.

```typescript
// ✅ Correct — one source of truth
export const OAUTH_SCOPES = {
  "readTasks": "Read tasks and their comments",
  "app-update-notification": "Broadcast refresh banners",
} as const;
export type OAuthScope = keyof typeof OAUTH_SCOPES;

Object.keys(OAUTH_SCOPES)   // the id list, where an array is needed
OAUTH_SCOPES[scope]         // the label
```

```typescript
// ❌ Wrong — the same vocabulary declared twice
export const OAUTH_SCOPES = ["readTasks", "app-update-notification"] as const;
export type OAuthScope = typeof OAUTH_SCOPES[number];
export const OAUTH_SCOPE_LABELS: Record<OAuthScope, string> = {
  "readTasks": "Read tasks and their comments",
  "app-update-notification": "Broadcast refresh banners",
};
```

A bare tuple (`as const` array) is fine ONLY while the members carry no data
at all. The moment a `Record<Member, X>` appears next to it, collapse both
into the object form.

Exception: when the per-member data lives across a bundling boundary (e.g.
frontend copy for backend-owned ids, where a value import would drag backend
code into the bundle), keep the tuple + type on the owning side and type the
far side as `Record<Member, X>` off the `import type`d union — the compiler
still enforces exhaustiveness, which is the point.

Same idea as `derive-types-from-zod-schemas-never-maintain-them-in-parallel`,
generalized: any vocabulary gets exactly one declaration, and everything else
— types, lists, lookups — is derived.
