---
topic: Loading and empty states
order: 30
---

# When you build a loading skeleton, render the real component with null data; don't write a separate FooSkeleton.

A loading state and its loaded state are **one component**. The component takes its data as nullable (`profile: ProfileRow | null`, or a `loading` prop) and renders the same frame either way; only the leaves that depend on the fetched data become bars (which leaves: `frontend/skeleton-bars-only-where-fetched-values-go`). Do not write a `FooSkeleton` that re-types the frame of `Foo`, and do not branch `if (!data) return <HandWrittenSkeleton />; return <FooLoaded data={data} />` at the top of a page.

A hand-written mirror is two layouts that must be kept equal by memory. They drift on the first edit to either one, and the page jumps when data lands. This has been "fixed" by re-mirroring many times; the mirror is the bug.

## The rules

1. **One frame.** Header, sections, rows, grids, paddings and gaps are rendered by the same JSX in both states. If the loaded view uses `SettingRow`, the loading view is that same `SettingRow` with `loading`.
2. **Primitives carry the loading state.** A row, cell or card component that appears in a loading surface takes `loading` (or nullable data) itself and renders its own bars, so every caller gets a matching skeleton for free.
3. **Row count is the only thing a list skeleton may guess.** Each placeholder row is the real row component in its loading state.

```tsx
// ❌ Wrong — a second tree. Headings and labels are bars, the field component differs
// from the loaded one, the textarea and its counter are missing.
if (!profile) {
  return (
    <SectionList>
      <SkeletonSection hint><SkeletonFieldList fields={2} /></SkeletonSection>
      <SkeletonSection hint><SkeletonFieldList fields={1} /></SkeletonSection>
    </SectionList>
  );
}
return <ProfilePageLoaded profile={profile} />;
```

```tsx
// ✅ Correct — one form. `profile` is null while loading.
function ProfileForm({ profile }: { profile: ProfileRow | null }) {
  const loading = profile === null;
  return (
    <Section heading={i18n.identity.title} hint={i18n.identity.hint}>
      <SettingRow label={i18n.fields.name} loading={loading}>
        <Controller control={control} name="name" render={…} />
      </SettingRow>
    </Section>
  );
}
```

## Checking it

Force the loading state (pass `null` where the data goes), screenshot, restore, screenshot. The two images must differ only inside the bars. If anything else moves, the frame is not shared.

The only standalone skeletons allowed are for a boundary where the loaded component cannot be rendered at all: the app shell before auth resolves, and a `lazy()` route's Suspense fallback. Those still build from the real layout components (`DashboardPaneHeader`, `PaneColumn`, `Section`).
