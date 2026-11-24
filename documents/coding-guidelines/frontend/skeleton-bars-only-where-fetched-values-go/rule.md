---
topic: Loading and empty states
order: 40
---

# When a skeleton contains static labels or controls, keep them as real text and controls; draw bars only where fetched values go.

A loading state is the loaded component rendered without its data
(`frontend/a-skeleton-is-the-loaded-component-rendered-without-data`); only the leaves that depend on the fetched data become bars.

1. **Static copy is never a bar.** Titles, section headings, hints, field labels, column headers and button captions are known before the fetch. Render them. A bar where a known label will be is a layout shift waiting to happen, and it hides what is loading.
2. **Controls that do not depend on the data render for real.** A Save button is the real `Button`, disabled. A value already in hand (the signed-in user's email) renders as itself.
3. **A bar occupies the exact box of what replaces it.**
   - A control: the control's height and its slot's width (`h-8` for `Input`/`Selector`; the slot decides the width, so the control must fill its slot rather than hug its content).
   - A line of text: `SkeletonLine` with the text's size, so the line box matches.
   - A block whose height comes from content or `rows`: give the real element an explicit height class and give the bar the same one.

```tsx
// ❌ Wrong — headings and labels are bars
<SkeletonSection hint><SkeletonFieldList fields={2} /></SkeletonSection>
```

```tsx
// ✅ Correct — the heading, hint and label are real text; only the field's value is a bar
<Section heading={i18n.identity.title} hint={i18n.identity.hint}>
  <SettingRow label={i18n.fields.name} loading={loading}>
    <Controller control={control} name="name" render={…} />
  </SettingRow>
</Section>
```
