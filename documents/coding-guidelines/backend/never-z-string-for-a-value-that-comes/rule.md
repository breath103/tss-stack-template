# Never `z.string()` for a value that comes from a known, closed set

When a user-supplied field is a category (a file kind, a MIME type, a status, an enum…), the zod schema should pin it to the valid values. A free `z.string()` lets anything through and forces every handler to repeat the same membership check.

Use `z.enum([...])` for a flat list, `z.discriminatedUnion("kind", [...])` when one field constrains another, and `z.literal(...)` inside the union variants.

```ts
// ✅ Correct — body pins contentType to the MIMEs registered for each kind.
const fileUploadBodySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("audio"),
    contentType: z.enum(FILE_KINDS.audio.mimes),
  }),
]);
```

```ts
// ❌ Wrong — "contentType: string" lets image/png through the audio path;
// every handler has to re-validate, and the type is string instead of a literal union.
body: {
  type: z.enum(["audio"]),
  contentType: z.string(),
}
```
