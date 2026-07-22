# Verify library config options by checking types

Never guess option placement. Check `.d.ts` files or use "Go to Definition".

```typescript
// ✅ Correct - verified in types
export const auth = betterAuth({
  advanced: {
    trustedProxyHeaders: true,
  },
});
```

```typescript
// ❌ Wrong - guessed placement
export const auth = betterAuth({
  trustedProxyHeaders: true,  // Not a top-level option
});
```
