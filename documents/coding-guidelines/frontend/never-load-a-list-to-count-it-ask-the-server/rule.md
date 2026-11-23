---
topic: Data loading
order: 50
---

# When you need a count or a yes/no about rows, ask the server; don't load the list to count it.

If the screen needs a **number** ("Used by 3") or a **yes/no** ("is anyone using this?"), the
client never fetches the full list of entities and counts or scans it. That moves every row over
the network, keeps them all in memory, and gets slower as the list grows. All of that work answers
a question the database can answer with one `count(*) … GROUP BY` or `EXISTS`.

```ts
// ❌ Wrong — every workspace and invitation of the account, to compute one boolean
const workspaces = useBillingAccountWorkspaces("account", billingAccountId);
const invitations = useBillingAccountWorkspaceInvitations(billingAccountId);
const uses = [
  ...workspaces.records.flatMap(w => w.onboarding?.definitionId ?? []),
  ...invitations.records.flatMap(i => i.workspace_onboarding_id ?? []),
];
const frozen = uses.includes(definition.id);
```

Two right shapes, in order of preference:

1. **The check guards a write → don't compute it on the client at all.** The server runs `EXISTS`
   inside the write and refuses with a typed error code; the client shows the message. The
   client-side copy would only go stale anyway.
2. **The screen displays the number → the server returns the aggregate.** It is a count over child
   rows, so it goes in a sidecar endpoint returning `{ <parent>_id, count }[]`
   (`backend/aggregates-over-a-child-table-go-in-a`), never on the entity row.

## How to spot it

- `.records.length`, `.filter(…).length`, `.some(…)`, `.includes(…)` or `.find(…) !== undefined`
  run on a list that the component loaded **only** to produce that number or boolean.
- A hook that calls `useRepositoryListQuery` / any `list*` fetch and returns a count, a set of
  ids, or a flag instead of the rows.
- A screen whose request payload grows with the number of related rows, while nothing on the
  screen renders those rows.

## When loading the list is fine

The screen **renders those rows anyway**, and the list is already loaded and complete (not
paginated). Then counting what is already in the cache costs nothing extra. Once the list is
paginated, a client-side count is wrong as well as slow, so the server must count.
