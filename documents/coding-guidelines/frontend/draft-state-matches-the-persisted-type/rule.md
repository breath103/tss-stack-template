# Draft state matches the persisted type

When you pull a value into `useState` to edit it, the draft type should match the underlying persisted type. Don't stringify numbers because you're going to render them in an `<input>`. Don't `JSON.stringify` objects into a text field for editing. The conversion happens at the render boundary, not in the state.

```tsx
// ❌ Wrong — duration is number on disk; stored as string in state because
// "inputs take strings." Now every save needs `Number(...)`.
const [duration, setDuration] = useState(String(metadata.duration));
```

```tsx
// ✅ Correct — draft is a number, same as the model
const [duration, setDuration] = useState(metadata.duration);
<input
  type="number"
  value={duration}                                // React coerces to string
  onChange={(e) => setDuration(Math.max(0, Number(e.target.value) || 0))}
/>
```

If the input can legitimately be "empty," use `number | null` — don't repurpose `0` or `""` as the empty sentinel.
