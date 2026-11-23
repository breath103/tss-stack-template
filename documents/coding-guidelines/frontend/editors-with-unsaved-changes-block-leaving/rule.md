---
topic: Forms
order: 50
---

# When a page has a Save button, block leaving with useUnsavedChangesGuard while the form is dirty.

Any page-level editor whose changes only persist on Save (settings forms, the onboarding
editor, anything gated by `save-buttons-gate-on-dirty-state`) calls
`useUnsavedChangesGuard(dirty)` from `@/hooks/useUnsavedChangesGuard`, with the same `dirty`
that enables its Save button. While dirty:

- an in-app navigation (sidebar link, list row, back button) is held behind the in-house
  confirm modal — "Leave without saving?" — and only proceeds on **Leave**;
- a tab close or reload gets the browser's own `beforeunload` prompt.

```tsx
// ✅ Correct — one dirty value drives both Save and the guard
const { control, handleSubmit, formState } = useForm<Values>({ defaultValues });
useUnsavedChangesGuard(formState.isDirty);

<Button type="submit" disabled={formState.isSubmitting || !formState.isDirty} />
```

```tsx
// ✅ Correct — state outside react-hook-form folds into the same flag
const dirty = formState.isDirty || draft !== saved;
useUnsavedChangesGuard(dirty);
```

```tsx
// ❌ Wrong — Save is dirty-gated, but clicking a sidebar link silently drops the edits
const { formState } = useForm<Values>({ defaultValues });
<Button type="submit" disabled={!formState.isDirty} />
```

A navigation that runs right after a successful save (e.g. moving to a renamed slug) passes
`ignoreBlocker: true`: the guard still sees the pre-save `dirty` until the next render.

Modals (`ModalForm`) are exempt — they don't navigate, and closing one is its own decision.
