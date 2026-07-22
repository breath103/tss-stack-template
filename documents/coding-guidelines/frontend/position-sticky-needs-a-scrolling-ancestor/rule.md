# `position: sticky` needs a scrolling ancestor — `overflow-hidden` traps it

`position: sticky` pins relative to the nearest ancestor that establishes a *scrolling box*. That ancestor is the closest element with `overflow: auto | scroll | hidden` (anything other than `visible`). If that ancestor doesn't actually scroll, sticky has nothing to pin against and silently degrades — the element scrolls with the page, looking exactly like `position: static`.

The trap: a desktop layout often wraps a grid in `overflow-hidden` to clip into rounded corners. On mobile the layout switches to block flow but the `overflow-hidden` stays, so any `mobile:sticky` you add inside silently does nothing.

Before adding `mobile:sticky` (or any sticky), walk OUTWARD from the sticky element and check every ancestor's overflow:
1. The first ancestor with `overflow: auto | scroll` → this IS the scroll container; sticky pins to its top. Good.
2. If you hit `overflow: hidden | clip` FIRST → sticky resolves to that non-scrolling ancestor and pins to nothing. Either set `overflow-visible` (mobile override) on that ancestor or move the sticky element outside it.
3. If you hit `<body>` / `<html>` without crossing any overflow → the page scrolls. Sticky pins to viewport. Good.

```tsx
// ❌ Wrong — `overflow-hidden` on the wrapper traps the sticky header.
// On desktop it's harmless (the grid fits inside without scrolling); on
// mobile the page scrolls in <main> two levels up, but the sticky header's
// nearest non-visible-overflow ancestor is this wrapper — pins to nothing.
<div className="grid overflow-hidden mobile:block">
  <div className="mobile:sticky mobile:top-0">Filter chrome</div>
  <RowList />
</div>
```

```tsx
// ✅ Correct — drop the overflow-hidden on the mobile branch so sticky
// resolves up to <main>'s overflow-auto.
<div className="grid overflow-hidden mobile:block mobile:overflow-visible">
  <div className="mobile:sticky mobile:top-0">Filter chrome</div>
  <RowList />
</div>
```

Symptom in the wild: you added `mobile:sticky mobile:top-0` to fix a header that scrolls away on a phone. Type-check is clean, dev compiles, and yet the header still scrolls away. Don't iterate on the sticky element — walk the ancestor chain and find the `overflow-hidden` that ate it.

If you can't easily edit the trapping ancestor (third-party wrapper, shared component used elsewhere), move the sticky element to a sibling of it instead — same visual effect, no overflow gymnastics.
