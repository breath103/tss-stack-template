---
topic: Buttons and async actions
order: 30
---

# When a button's action ends in a redirect, keep it loading until the next page has replaced this one.

A button whose async action ends in a redirect must stay loading until the next page replaces
this one. If the action resolves while this page is still on screen, `useMutation` (or a form's
`isSubmitting`) flips back to idle, the spinner disappears, the button is clickable again, and
*then* the page changes. It reads as "the click did nothing" and invites a second click. This
has shipped more than once (tool OAuth connect, OAuth consent Allow/Deny, Google/Microsoft
sign-in, duplicate onboarding definition).

## Full-page redirect → `waitUntilPageLeave`

`location.assign(url)`, `location.href = url`, and better-auth's `signIn.social(...)` all return
**immediately** — the browser keeps showing this page for up to a few seconds while the next one
loads. Hand the navigation to `waitUntilPageLeave` from `@/lib/leave-page`:

- `waitUntilPageLeave(url)` — navigates to `url`.
- `waitUntilPageLeave(async () => { … })` — for a call that navigates by itself (`signIn.social`).

It stays pending until the page unloads, and settles on `pageshow`, so Back from the target page
(a bfcache restore) un-sticks the button instead of leaving it spinning forever. Never "fix" this
by treating mutation `success` as loading — that is exactly the state a bfcache restore brings
back. Never write `location.href =` / `location.assign` in a button's action directly.

Check the library's failure path: better-auth's client returns `{ error }` instead of throwing, so
throw on it inside the callback, or a failed sign-in spins forever.

## In-app navigation → `await navigate(...)`

TanStack Router's `navigate` returns a promise that settles when the transition completes. Inside
an async button action or form submit, **await it** — `void navigate(...)` resolves the action
while the old route is still showing, which is the same flicker.

```tsx
// ✅ Correct
const start = useMutation(async () => {
  await waitUntilPageLeave(async () => {
    const { error } = await signIn.social({ provider, callbackURL, errorCallbackURL });
    if (error) throw new Error(error.message);
  });
}, [provider, callbackURL, errorCallbackURL]);

const allow = useMutation(async () => {
  const { redirectTo } = await api.fetch("/api/oauth/consent", "POST", { body });
  await waitUntilPageLeave(redirectTo);
}, [body]);

const duplicate = useMutation(async () => {
  const copy = await mutations.createDefinition(accountId, input);
  await navigate({ to: "/billing/$billingAccountId/onboarding/$definitionId", params: { … } });
}, [accountId, input]);
```

```tsx
// ❌ Wrong — each resolves while the old page is still visible: loading → idle → (redirect)
const start = useMutation(async () => {
  await signIn.social({ provider, callbackURL, errorCallbackURL });
}, [provider, callbackURL, errorCallbackURL]);

const allow = useMutation(async () => {
  const { redirectTo } = await api.fetch("/api/oauth/consent", "POST", { body });
  location.href = redirectTo;
}, [body]);

const duplicate = useMutation(async () => {
  const copy = await mutations.createDefinition(accountId, input);
  void navigate({ to: "/billing/$billingAccountId/onboarding/$definitionId", params: { … } });
}, [accountId, input]);
```

Not covered: `window.open(url, "_blank")` (a new tab leaves this page in place, so the action is
genuinely done), a synchronous `onClick={() => navigate(...)}` with no loading state, and a
navigation fired *before* an optimistic mutation.
