---
topic: Errors and fallbacks
order: 80
---

# When you are about to write a `??` default, an optional parameter or a catch that continues, don't: require the value unless a real caller passes nothing.

Model values as required unless a concrete caller or lifecycle state requires absence.
Do not add `??` defaults, optional parameters, optional schema fields, empty-string
sentinels, compatibility normalization, or catch-and-continue behavior because a value
might be missing. If execution requires the value, require it in the type or schema and
fail clearly at the boundary where configuration enters the system. If execution does
not require it, omit it instead of synthesizing or forwarding it.

Optionality is valid only when absence is part of current behavior, such as a realtime
response that has not arrived, credentials for a provider that is not selected, or an
HTTP header the protocol permits clients to omit. Tests and dependency-injection seams
follow the same rule: pass required dependencies explicitly and throw on impossible test
states rather than continuing with dummy values.

```tsx
// ❌ Wrong — the page only renders once the project is loaded, so no caller takes the
// absent branch. `""` is an invented stand-in that hides a bug if one ever does.
<Heading text={project?.name ?? ""} />
const form = useForm({ defaultValues: { description: task.description ?? "" } });

// ✅ Correct — require it where it enters, then use it
<Heading text={project.name} />
```

**Not a fallback: converting a real `null` at an input.** A nullable column is `null` in
state and in the draft; an `<Input>` cannot show `null`, so the input converts both ways
at the render boundary. Absence is real there (the column is nullable) and nothing
downstream ever sees the `""`. `frontend/draft-state-matches-the-persisted-type` has the
full pattern.

```tsx
// ✅ Correct — `?? ""` exists only on the input's `value`, and onChange maps it back
<Input value={field.value ?? ""} onChange={value => field.onChange(value === "" ? null : value)} />
```

The test for any `?? x`: is the left side `null` in a state a user can reach, and is `x`
converted back before it is stored or sent? Both yes → a boundary conversion. Otherwise →
an invented value; delete it.

When reviewing a fallback, identify the concrete caller that takes the absent branch.
If there is none, delete the branch. Do not preserve speculative compatibility for code
owned and changed in the same task.
