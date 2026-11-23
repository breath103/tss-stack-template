---
topic: Text and sizes
order: 30
---

# When a form field needs a hint line, pass it as the hint prop of TextField or LabeledField; don't write a paragraph under the field.

The `hint` prop of `TextField` / `LabeledField` owns the hint's size and spacing. A
hand-written small paragraph under the field picks its own.

```tsx
// ❌ Wrong — a field's hint as a hand-written small paragraph under it
<TextField control={control} name="name" label={i18n.name} />
<p className="-mt-2 text-sm text-text-3">{i18n.nameHint}</p>

// ✅ Correct — the `hint` prop of TextField / LabeledField owns the size and the spacing
<TextField control={control} name="name" label={i18n.name} hint={i18n.nameHint} />
<LabeledField label={i18n.role} hint={i18n.roleHint}>
  <Selector … />
</LabeledField>
```

Lint (`local/no-small-text-in-modal-form`) rejects `text-sm` / `text-xs` written inside a
`<ModalForm>`. Everywhere else this guide is the only check.
