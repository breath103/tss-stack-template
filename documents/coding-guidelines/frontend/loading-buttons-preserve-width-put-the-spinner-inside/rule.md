# Loading buttons: preserve width, put the spinner *inside*

When an action button is submitting, do not swap the label text (`"Create"` → `"Creating..."`) — the button resizes, the layout jumps, and the eye loses where it was. Keep the label mounted (just invisible), and overlay a spinner in the same centered position. Width is preserved because the label still takes space.

If the `Button` component supports a `loading` prop, use it. Otherwise, wrap children in an `invisible` span and absolutely position the spinner on top.

```tsx
// ✅ Correct — width doesn't change, spinner inside
<Button type="submit" loading={submit.status === "loading"}>
  Create
</Button>
```

```tsx
// ❌ Wrong — label swap causes a width jump on every submit
<Button type="submit" disabled={submit.status === "loading"}>
  {submit.status === "loading" ? "Creating..." : "Create"}
</Button>
```
