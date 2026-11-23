---
topic: Forms
order: 40
---

# When you pre-fill a form or draft from a row, keep the row's types (null stays null, numbers stay numbers); convert to a string only at the input.

When you pull a value into `useState` to edit it, the draft type should match the underlying persisted type. Don't stringify numbers because you're going to render them in an `<input>`. Don't `JSON.stringify` objects into a text field for editing. The conversion happens at the render boundary, not in the state.

```tsx
// ❌ Wrong — duration is number on disk; stored as string in state because
// "inputs take strings." Now every save needs `Number(...)`.
const [duration, setDuration] = useState(String(metadata.duration));
```

```tsx
// ✅ Correct — draft is a number, same as the model
const [duration, setDuration] = useState(metadata.duration);
<input
  type="number"
  value={duration}                                // React coerces to string
  onChange={(e) => setDuration(Math.max(0, Number(e.target.value) || 0))}
/>
```

If the input can legitimately be "empty," use `number | null` — don't repurpose `0` or `""` as the empty sentinel.

The same holds for `useForm`. A nullable column stays nullable in `defaultValues`; `""` exists only at the input.

```tsx
// ❌ Wrong — "" stands in for null in the draft, so submit has to map it back
const form = useForm({ defaultValues: { description: keychain.description ?? "" } });
const onSubmit = (values) => save({ description: values.description === "" ? null : values.description });
```

```tsx
// ✅ Correct — the draft is string | null like the row; the input converts both ways
const form = useForm({ defaultValues: { description: keychain.description } });
<Controller
  name="description"
  control={form.control}
  render={({ field }) => (
    <Input value={field.value ?? ""} onChange={value => field.onChange(value === "" ? null : value)} />
  )}
/>
```

A neighbouring form that does the `?? ""` version is not a precedent.

The `field.value ?? ""` on the input is the one `?? ""` that
`sharing-code/do-not-invent-optional-values-or-fallbacks` allows: the column really is
nullable and `onChange` converts back. Anywhere else, `?? ""` is an invented value.
