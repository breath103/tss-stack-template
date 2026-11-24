---
topic: Forms
order: 30
---

# When you build an edit form, disable Save until the form is dirty, call reset(values) after saving, and stay on the page.

Two halves of the same edit-form action, both recurring bugs:

## 1. Disable Save while the form is pristine

A Save/Submit button must be **disabled until the form actually differs from its loaded values**, and re-disable itself after a successful save. Don't leave Save permanently enabled — an enabled Save on an unchanged form invites no-op writes and gives the user no signal that there's nothing to save.

With `react-hook-form` this is `formState.isDirty` — no bespoke "compare current values to the loaded task" `useState`. After a successful in-place save, call `reset(savedValues)` so the saved values become the new baseline (`isDirty` flips back to `false`, Save disables again).

```tsx
// ✅ Correct — dirty gates Save; reset re-baselines after an in-place save
const { control, handleSubmit, reset, formState } = useForm<Draft>({ defaultValues });

const onSubmit = handleSubmit(values => {
  mutations.update(entity, values);
  reset(values); // saved values are pristine now → Save disables until the next edit
});

<Button type="submit" loading={formState.isSubmitting} disabled={formState.isSubmitting || !formState.isDirty} />
```

```tsx
// ❌ Wrong — Save always enabled, no dirty gate
<Button type="submit" disabled={formState.isSubmitting} />
```

## 2. An in-place edit doesn't navigate away on save

A master-detail edit form (row stays selected in a list, detail on the right) must **stay on the edit page** after Save. The row updates in place through `RepositoryContext` (optimistic write), so there is nothing to navigate to — bouncing back to the list on every save is a bug that throws away the user's place. Reserve navigation for **create** (go to the freshly-minted entity's detail — that keeps the user in the editor, it doesn't dump them to the list) and for **cancel**.

```tsx
// ✅ Correct — edit stays put; only create navigates
const onSubmit = handleSubmit(async values => {
  if (entity) {
    mutations.update(entity, values);
    reset(values);            // stay on the page, re-baseline
  } else {
    onCreated(await mutations.create(values)); // navigate to the new entity's detail
  }
});
```

```tsx
// ❌ Wrong — every save (edit included) navigates back to the list
const onSubmit = handleSubmit(async values => {
  if (entity) mutations.update(entity, values);
  else await mutations.create(values);
  onDone(); // ← bounces the user off the edit page they were working on
});
```
