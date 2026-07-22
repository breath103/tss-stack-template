# Use `ModalForm` for a form in a modal — don't hand-roll the shell

If a modal's body is a **form** — a few fields plus a cancel/submit footer —
render `@/components/ui/ModalForm` and open it through
`useModal().openModal(...)`. Don't hand-compose `ModalShell` / `Dialog` +
`<form>` + a footer, and don't reach for radix `Dialog` when the other
form-modals in the app use `ModalForm`.

`ModalForm` owns the parts every form-modal repeats: the header, the
`space-y-4 p-6` form body, the optional root-error banner, and the
cancel/submit footer with `loading` + `disabled` wiring. Hand-rolling them
means every callsite re-derives the padding, the button order, the error
placement, and the submit-loading state — and drifts from the canonical in at
least one of them. Mounting through `openModal` also puts the modal in the
shared `AnimatePresence` portal, so its enter/exit animation is correct for
free (see `all-overlaying-ui-must-have-enter-and-exit`).

Build the field rows from the shared form components — `TextField` /
`NullableSelectField` (`components/ui/FormFields`), or `LabeledField` +
`Controller` for a control that isn't covered — and drive state with
`react-hook-form` (see `use-react-hook-form-for-form-state-never`).

```tsx
// ❌ Wrong — hand-rolled Dialog + <form> + footer for a plain field form
<Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
  <DialogContent className="w-96">
    <DialogTitle>{i18n.createTaskTitle}</DialogTitle>
    <form onSubmit={(e) => void handleSubmit(onValid)(e)}>
      <label className="block">
        <span className="mb-1 block text-xs text-text-3">{i18n.title}</span>
        <Controller ... />
      </label>
      {errors.root && <p className="text-sm text-error">{errors.root.message}</p>}
      <DialogFooter>
        <Button variant="normal" content="text" text={i18n.cancel} onClick={onClose} />
        <Button type="submit" variant="accent1" content="text" text={i18n.create} loading={isSubmitting} />
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

```tsx
// ✅ Correct — ModalForm owns the shell + footer; fields are the children
<ModalForm
  title={i18n.createTaskTitle}
  onClose={onClose}
  onSubmit={(e) => void handleSubmit(onValid)(e)}
  rootError={errors.root?.message}
  cancelLabel={i18n.cancel}
  submitLabel={i18n.create}
  isSubmitting={isSubmitting}
>
  <TextField control={control} name="title" label={i18n.title} rules={{ required: true }} required />
</ModalForm>

// opened via the shared portal, matching every other form-modal:
onClick={() => openModal(CreateLinkedTaskModal, { objectiveId })}
```

## `ModalForm` doesn't fit? Extend it — don't clone it

If the form needs something `ModalForm` doesn't express — a wider
`presentation`, a submit gated until a value validates — add the prop to
`ModalForm` (both are already there: `presentation`, `submitDisabled`). One
primitive everyone tunes beats N bespoke shells. This is the modal-form case
of `use-in-house-components-never-hand-roll-styled-clones`.

## Carve-outs — these are not "a form + a footer", leave them alone

- **Non-form action modals** — a scrollable review/confirm surface with its
  own action bar (e.g. the standup modal) is not a field form. Use `ModalShell`
  directly.
- **Confirm dialogs** — use `ConfirmDialog` / `useModal().confirm`, not `ModalForm`.
- **Schema-driven forms that own their own submit** — a generic form renderer
  (`AutoForm`) that renders its own submit button lives inside `ModalShell`;
  there's no external cancel/submit footer for `ModalForm` to own.
