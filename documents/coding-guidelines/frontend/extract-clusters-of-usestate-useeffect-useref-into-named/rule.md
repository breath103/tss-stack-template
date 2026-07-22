# Extract clusters of useState / useEffect / useRef into named hooks

When a component grows a group of hooks that together implement one feature (resize, drag, keyboard focus trap, file upload, infinite scroll, …), move that group into a named custom hook. The component body should read top-to-bottom as: call hooks → compute a few values → return JSX. Anything more than trivial side-effect wiring belongs behind a hook name.

Signals that a cluster is ready to extract:

- Two or more of `useState` / `useEffect` / `useRef` / `useCallback` all touch the same feature and nothing else.
- The effect closes over the same state + set-function + refs.
- You'd have trouble naming the component's concern because it's actually doing two things.

```tsx
// ✅ Correct — the feature is named; DialogShell just composes it.
function DialogShell() {
  const { ref, onResizeStart } = useResizableWidth({ storageKey: "memory-detail-width", defaultWidth: 560 });
  return <div ref={ref}><ResizeHandle onMouseDown={onResizeStart} /></div>;
}
```

```tsx
// ❌ Wrong — resize logic bleeds into the component body
function DialogShell() {
  const [width, setWidth] = useState(560);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => { ref.current?.style.setProperty("width", `${width}px`); }, [width]);
  const onResizeStart = useCallback((e) => { /* 15 lines of mouse tracking */ }, [width]);
  return <div ref={ref}>...</div>;
}
```
