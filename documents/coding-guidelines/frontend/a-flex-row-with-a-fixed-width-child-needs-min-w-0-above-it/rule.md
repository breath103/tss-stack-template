---
topic: CSS and classNames
order: 70
---

# When a flex row has a fixed-width child, put min-w-0 on every flex ancestor so the row can shrink.

A flex item defaults to `min-width: auto`, which means **it refuses to shrink below
its content's intrinsic width**. As long as every column in a row is `flex-1`, that
never bites — the intrinsic widths are small and everything negotiates. The moment
one column gets a *fixed* width (a resizable panel, a `w-72` sidebar), the row's
intrinsic width becomes large, and any ancestor missing `min-w-0` silently grows past
its parent instead of sharing out the space it actually has.

The failure is **invisible**: an ancestor with `overflow-hidden` clips the overflow,
so `document.scrollWidth === clientWidth` and nothing reports a problem — a panel has
simply been pushed off the right edge of the screen.

```tsx
// ✅ Correct — the column can shrink, so the row shares the width it really has
<div className="min-h-0 min-w-0 flex-1">
  <WorkspaceView />        {/* contains a fixed-width panel + a shrink-0 sidebar */}
</div>
```

```tsx
// ❌ Wrong — min-width:auto, so this column grows to its content's intrinsic width
//    and the sidebar inside it lands outside the viewport
<div className="min-h-0 flex-1">
  <WorkspaceView />
</div>
```

## The companion half: give every flexible column a floor

Once ancestors *can* shrink, flex will happily take the unconstrained column to zero.
Whichever column has no `min-w-*` is the one that collapses — in a chat + file-viewer
split, an unbounded thread rendered one character per line while the viewer sat at its
floor. Decide which surface is primary and give it the larger floor; give the
secondary one a floor too, so neither can vanish:

```tsx
<div className="min-w-96 flex-1 mobile:min-w-0">   {/* primary: yields last */}
<div className="min-w-80" style={{ width }}>       {/* resizable: has a floor of its own */}
```

Pair every `min-w-*` floor with `mobile:min-w-0` — a 384px floor overflows a 375px
phone (see `responsive-reach-for-the-mobile-class-variant-first`).

## How to verify

Don't trust `scrollWidth`; it lies when an ancestor clips. Assert the panel that
*should* be last is inside the viewport:

```ts
const box = el.getBoundingClientRect();
step("sidebar is on screen", box.right <= window.innerWidth);
```
