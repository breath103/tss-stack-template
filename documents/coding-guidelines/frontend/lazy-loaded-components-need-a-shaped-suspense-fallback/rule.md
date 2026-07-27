# Lazy-loaded components need a shaped Suspense fallback — never `null`, never a blank box

Any component behind `lazy(() => import(...))` renders its `<Suspense fallback>` for the
entire time the chunk is in flight — a cold cache on a slow connection makes that hundreds of
milliseconds of screen the user actually stares at. That fallback has two jobs at once, and
most hand-written ones do neither:

1. **Say "loading now."** `fallback={null}`, `fallback={<></>}`, and flat colored boxes
   (`<div className="h-screen bg-background" />`) all render as *nothing happening*. The user
   clicked a link and got a blank screen — indistinguishable from a dead route, a crashed
   bundle, or a click that didn't register. They click again, or leave.
2. **Don't move anything.** Whatever the fallback occupies, the resolved component must occupy
   too. A fallback that's shorter, narrower, or missing the panel chrome makes the whole page
   jump the instant the chunk lands — the classic layout-shift flash that reads as jank even
   when the load was fast.

These two pull against each other if you reach for a spinner: a centered `<Spinner />` says
"loading" but reserves none of the real layout, so it fails (2). The resolution is the same one
the data-loading rules landed on — **a skeleton that mirrors the real layout.** It animates, so
it reads as in-progress; it occupies the real boxes, so nothing shifts.

```tsx
// ✅ Correct — fallback mirrors the resolved page's frame: same flex shell,
// same fixed-width bordered aside, same padding. Only the contents are stand-ins.
const PlaygroundPage = lazy(() => import("./PlaygroundPage").then(m => ({ default: m.PlaygroundPage })));

<Suspense fallback={<PlaygroundPageSkeleton />}>
  <PlaygroundPage />
</Suspense>;
```

```tsx
// ❌ Wrong — renders as a dead screen; no signal anything is happening
<Suspense fallback={null}><PlaygroundPage /></Suspense>
<Suspense fallback={<div className="h-screen bg-background" />}><PlaygroundPage /></Suspense>

// ❌ Wrong — signals loading but reserves none of the layout; the page jumps on resolve
<Suspense fallback={<div className="flex h-screen items-center justify-center"><Spinner /></div>}>
  <PlaygroundPage />
</Suspense>
```

**Build the skeleton from the `<Skeleton>` primitive** — never hand-rolled `animate-pulse`
divs; see `skeleton-bars-use-the-skeleton-primitive-never-hand` for the primitive and its
import path.

**Colocate the skeleton with the component it stands in for**, in the same folder, and treat
them as a pair: when the real component's frame changes (a sidebar widens, a header row is
added), the skeleton changes in the same commit. A skeleton that has drifted from its component
is worse than no skeleton — it guarantees the layout shift it exists to prevent.

**Mirror the frame, not the contents.** Copy the structural classes that determine geometry —
`h-screen`, `flex`, `flex-1`, fixed widths like `w-85 shrink-0`, `border-l`, `bg-surface-1`,
padding — and fill the interior with a handful of `<Skeleton>` bars roughly where the real
controls sit. Do not try to reproduce every row; an approximate interior inside an exact frame
shifts nothing, because the frame is what holds the layout.

This rule is about **code**-splitting boundaries. `any-surface-with-a-loading-state-shows-a`
covers the same skeleton-over-spinner principle for **data** loading; the two compose — a lazy
route whose resolved component then fetches will show the lazy skeleton, then the data
skeleton, with no jump between them if both mirror the same frame.
