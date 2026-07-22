# Don't lock a surface to one theme — use the tokens; both modes are already wired

When a section needs visual lift from the page (login card, callout, dialog, code block), it's tempting to "just" hardcode `bg-white` because you only thought about light mode. Don't. Every surface token already has both a light and a dark value — using them gives you both modes for free.

Two failure modes to avoid:

1. **Hardcode + per-element overrides.** Sets `bg-white`, then patches the heading and subtitle text colors inline, leaving `<Input>` / `<Button>` and child borders reading themed tokens that don't match the forced background. Looks fine in one mode, broken in the other.
2. **Fork the tokens locally.** Scope-override tokens on a wrapper to "fix" descendants. This duplicates the token system, drifts from global values the moment they change, and is exactly as much work as just rendering a theme-aware tree to begin with.

```tsx
// ✅ Correct — tokens flip per theme automatically; one tree, both modes
<div className="bg-card text-foreground border">
  <h1>Log in</h1>
  <p className="text-muted-foreground">Sign in to continue.</p>
  <Input />
  <Button />
</div>
```

```tsx
// ❌ Wrong — bg-white locks one mode; inline color overrides only patch the
// elements you remember; descendants like <Input> ship invisible in the other.
<div className="bg-white">
  <h1 style={{ color: "#1a1a1a" }}>Log in</h1>
  <Input />
</div>
```
