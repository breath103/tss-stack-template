---
requires: entity-repository
---

# Expose `ObservableValue<T>` — never a value getter alongside the subject

**Scope**: Controllers / stores / context-values that hold reactive state in a
`BehaviorSubject<T>` (or any `ObservableValue<T>`). Applies anywhere we write
a class or factory that publishes "current state + a stream of changes."

`ObservableValue<T>` exists *precisely* to be the one handle a class hands
out for both needs:

```ts
export interface ObservableValue<T> extends Observable<T> {
  readonly value: T;
}
```

One reference. Consumers who want a snapshot do `subject.value`. Consumers
who want to re-render on change do `useObservableValue(subject)` /
`useObservableValueMap(subject, sel, deps)` / `subject.subscribe(...)`. No
second API.

The mistake is to add a value getter ALONGSIDE the subject:

```ts
class TasksFiltersController {
  public readonly view$: BehaviorSubject<ViewTabId>;
  public get activeTab() { return this.view$.value; }   // ❌
}
```

Now there are TWO ways to read the value, and the getter is the SHORTER one
— so every consumer reaches for it. Every one of those consumers becomes a
render-time read that *looks* free but breaks re-render scope. The
component holding `controls.activeTab` must re-render when activeTab
changes, which means *something above it* must subscribe and re-render to
re-execute the getter, which means everything below that subscriber
re-renders too. A single `controls.activeTab` at the top of a page can
re-render the entire tree on every URL change.

The fix: **delete the getter**. Expose the subject as `ObservableValue<T>`
(narrow it from `BehaviorSubject<T>` so consumers can't `.next()` on it).
Make the consumer pick — snapshot or subscribe — by typing two characters
more.

**Why**:

- **One source of truth.** A getter + subject inevitably drift (someone
  forgets to emit through the subject when setting the underlying value, or
  reads the wrong one). The subject IS the value.
- **Render scope is decided by the consumer, not by the class.** The class
  hands out a stable reference; the consumer chooses whether to subscribe.
  With a getter, the class has silently coupled every consumer's
  re-render scope to "whoever last triggered a re-render of the
  getter-reader."
- **`useEvent` / mutation callbacks read at call time anyway.** They want
  `.value`, not a subscription. Forcing the value through a getter
  prevents them from being clear about the snapshot intent (they
  accidentally take a render-time snapshot instead).
- **TS already distinguishes the two intents.** `value: T` is a snapshot;
  `subscribe(fn)` is a stream. The getter pretends they're the same thing.

### ❌ Wrong

```ts
class TasksFiltersController {
  public readonly view$: BehaviorSubject<ViewTabId>;
  public readonly userFilter$: BehaviorSubject<Filter>;
  public readonly narrowing$: BehaviorSubject<Filter>;
  public readonly savedViews$: BehaviorSubject<TasksView[]>;

  public get activeTab() { return this.view$.value; }            // ❌ duplicates view$.value
  public get userFilter() { return this.userFilter$.value; }     // ❌ duplicates userFilter$.value
  public get narrowing() { return this.narrowing$.value; }       // ❌
  public get savedViews() { return this.savedViews$.value; }     // ❌
  public get activeSavedView(): TasksView | null {               // ❌ derived getter — should be observable
    const v = this.view$.value;
    if (!isSavedViewTabId(v)) return null;
    return this.savedViews$.value.find((x) => x.id === v) ?? null;
  }
  public get effectiveDimension1(): Dimension1 | undefined {     // ❌ derived getter — should be observable
    return this.d.urlDimension1 ?? this.activeSavedView?.state.dimension1;
  }
}

// callers everywhere
const activeTab = controls.activeTab;                            // render-time read; parent must re-render
const dim1 = controls.effectiveDimension1 ?? "project";          // same
const filters = controls.narrowing;                              // same
```

### ✅ Right

```ts
class TasksFiltersController {
  // Subjects, exposed as ObservableValue<T> — `next()` stays internal.
  public readonly view$: ObservableValue<ViewTabId>;
  public readonly userFilter$: ObservableValue<Filter>;
  public readonly narrowing$: ObservableValue<Filter>;
  public readonly savedViews$: ObservableValue<TasksView[]>;
  // Derived state is a derived ObservableValue too — `combineLatest` + a
  // BehaviorSubject so consumers get .value AND subscribe semantics.
  public readonly activeSavedView$: ObservableValue<TasksView | null>;
  public readonly effectiveDimension1$: ObservableValue<Dimension1 | undefined>;
  public readonly effectiveDimension2$: ObservableValue<Dimension2 | undefined>;
  public readonly effectiveStrict$: ObservableValue<boolean>;
  public readonly effectiveTimeline$: ObservableValue<boolean>;
  // NO value getters. Consumers use .value for snapshots, the hooks to subscribe.
}

// Snapshot intent (event-time / commit-time / inside useEvent):
const activeTab = controls.view$.value;

// Subscribe intent (must re-render on change):
const activeTab = useObservableValue(controls.view$);
const dim1 = useObservableValue(controls.effectiveDimension1$) ?? "project";

// Inside an event-only hook (the value is needed at call time, not render):
const create = useEvent(() => api.fetch(…, { dim: controls.effectiveDimension1$.value }));
```

### How to expose a derived `ObservableValue<T>`

`Observable.pipe(...)` returns `Observable<T>`, NOT `ObservableValue<T>` —
it has no `.value`. Wrap it in a BehaviorSubject (or use the project's
`combineSubjects` / equivalent helper) so it satisfies `ObservableValue<T>`:

```ts
const out = new BehaviorSubject<T>(initialValue(...));
combineLatest([a$, b$]).pipe(map(...), distinctUntilChanged()).subscribe(out);
this.foo$ = out;   // typed as ObservableValue<T>
```

Now consumers can do `this.foo$.value` (snapshot) AND
`useObservableValue(this.foo$)` (subscribe) on the same handle.

### Migration recipe

For every value getter on a controller / store:

1. Confirm it just returns `this.someSubject$.value` (or a tiny pure
   derivation of one or more `.value`s).
2. If pure passthrough: **delete the getter**. Rewrite every caller —
   `controls.foo` → `controls.foo$.value` (snapshot) or
   `useObservableValue(controls.foo$)` (subscribe). The caller's intent is
   now explicit.
3. If derived from multiple subjects: turn it into a derived
   `ObservableValue<T>` (see above). Delete the getter. Same caller rewrite.
4. If the snapshot site genuinely never needs to re-render (an `onClick`,
   a `useEvent` body) → `.value`. Otherwise → `useObservableValue` /
   `useObservableValueMap`. The reviewer asks at every former-getter call
   site: "does this site need to re-render when the value changes?"

### How a reviewer checks

1. Search the controller / store for `public get`. Every getter that reads
   `this.someSubject$.value` is a violation.
2. Search call sites for `controls.foo` (no `$`). Each one is either a
   snapshot (should be `controls.foo$.value`) or a subscription (should be
   `useObservableValue(controls.foo$)`). Decide; rewrite.
3. Any `pipe(...)` exposed as a controller field should be wrapped in a
   `BehaviorSubject` so it satisfies `ObservableValue<T>` — otherwise
   consumers can't snapshot it, and you'll see callers manually
   `firstValueFrom` / `combineLatest` to work around the missing `.value`.