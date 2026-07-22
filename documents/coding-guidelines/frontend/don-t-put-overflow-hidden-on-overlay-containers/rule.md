# Don't put `overflow-hidden` on overlay containers that host rich editors

Rich-text editors (Tiptap, BlockNote, any ProseMirror-based editor) render floating UI — slash menus, block-handle popovers, formatting toolbars — outside the editor's own bounds, often positioned relative to the viewport via portals or near the block's left margin. Putting `overflow-hidden` on the surrounding overlay container (`Dialog.Content`, sheet, popover) clips those floating surfaces.

Move the scroll boundary to an *inner* body. The outer overlay stays `overflow-visible` so floating editor UI can escape; the inner container handles vertical scroll.

```tsx
// ✅ Correct — no overflow on Dialog.Content; inner body owns scroll
<Dialog.Content className="fixed ... flex flex-col border-l">
  <Header />
  <div className="min-h-0 flex-1 overflow-auto">
    <MarkdownEditor /> {/* slash menu + handles can extend outside */}
  </div>
</Dialog.Content>
```

```tsx
// ❌ Wrong — overflow-hidden clips the editor's portalled popovers
<Dialog.Content className="fixed ... flex flex-col overflow-hidden border-l">
  <Header />
  <div className="min-h-0 flex-1 overflow-auto">
    <MarkdownEditor /> {/* slash menu gets cut at Dialog edge */}
  </div>
</Dialog.Content>
```

Same principle applies to any container wrapping a rich editor — don't clip the space where its hover UI needs to render.
