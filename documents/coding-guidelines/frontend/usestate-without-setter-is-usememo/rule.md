# `useState` without a setter is `useMemo`

If you destructure `useState` and never use the setter, you don't have state — you have a stable value. Use `useMemo`.

```ts
// ❌ Wrong — `setSubject` is never called, this isn't state
const [subject] = useState(() => new BehaviorSubject<string | null>(null));

// ✅ Correct
const subject = useMemo(() => new BehaviorSubject<string | null>(null), []);
```

Both forms produce a once-per-mount stable value. `useState` reads as "I'm holding state that might change" — and anyone scanning the file looks for the matching `setSubject(…)` and gets confused when there isn't one. `useMemo` says "compute this once" out loud.

Same applies to `useRef` initialized to a value never reassigned via `.current = …`:

```ts
// ❌ Wrong — ref.current is never written
const subjectRef = useRef(new BehaviorSubject<string | null>(null));
const subject = subjectRef.current;

// ✅ Correct
const subject = useMemo(() => new BehaviorSubject<string | null>(null), []);
```

(`useRef` for DOM nodes is a different thing — there's no value to hold yet, and `ref.current` IS written, by React, when the JSX attaches.)
