---
topic: Repositories and services
order: 10
---

# When you create a repository or service, write a class with constructor-injected deps and export one instance.

Anything with methods on the backend (repos, services, anything "instance"-shaped) is a `class` — never a plain object literal exported as a const. The class owns the methods; the singleton lives next to it as `export const fooThing = new FooThing(...deps)`. This is non-negotiable for two reasons:

1. **Dependencies are explicit and replaceable.** A service that touches multiple repos takes them as constructor params; tests substitute mocks by passing a stub. An object-literal "service" that imports `memoriesRepo` directly forces every test to monkey-patch a module — TS won't help you, and the seam isn't visible from the call site.
2. **Class types compose without `typeof` dances.** When `MemoryService` injects `EntitiesRepository` and the repo is a class, the constructor signature reads `(entities: EntitiesRepository, memories: MemoriesRepository)`. When the repo is `export const entitiesRepo = { ... }`, the dependency type has to be `typeof entitiesRepo` — and if the constructor parameter happens to share the name, TypeScript can't resolve which `entitiesRepo` you mean (TS2502: "referenced directly or indirectly in its own type annotation"). The workaround is hoisting `type EntitiesRepo = typeof entitiesRepo;`, which is a bandage on a missing class declaration. The class IS the type. Don't write the bandage; write the class.

```ts
// ✅ Correct — class with the methods, singleton with the wiring.
export class MemoriesRepository {
  async list(userId: string, opts?: ...): Promise<Memory[]> { ... }
  async getById(userId: string, id: string): Promise<Memory | null> { ... }
  async create(userId: string, input: MemoryWriteInput): Promise<Memory> { ... }
  async update(userId: string, id: string, patch: MemoryPatch): Promise<Memory | null> {
    const existing = await this.getById(userId, id); // peer-method calls via `this`
    if (!existing) return null;
    ...
  }
}

export const memoriesRepo = new MemoriesRepository();
```

```ts
// ✅ Correct — service injects class types directly. No typeof, no aliases.
export class MemoryService {
  constructor(
    private readonly entities: EntitiesRepository,
    private readonly memories: MemoriesRepository,
  ) {}

  async create(userId: string, input: MemoryWriteInput): Promise<Result<Memory, CreateError>> {
    const missing = await this.entities.findMissing(userId, collectEntityRefs(input.metadata));
    if (missing.length > 0) return { failure: { code: "unknown_entity_refs", missing } };
    return { success: await this.memories.create(userId, input) };
  }
}

export const memoryService = new MemoryService(entitiesRepo, memoriesRepo);
```

```ts
// ❌ Wrong — object-literal repo. Forces typeof aliases at every dependent
// service's constructor and breaks down when names collide. There's no
// reason for the call-site shape (memoriesRepo.list(...)) to leak into the
// declaration shape — keep the singleton, keep the call-site, but use a
// real class behind it.
export const memoriesRepo = {
  async list(userId: string, opts?: ...) { ... },
  async getById(userId: string, id: string) { ... },
  async update(userId: string, id: string, patch: MemoryPatch) {
    const existing = await this.getById(userId, id);
    ...
  },
};
```

```ts
// ❌ Wrong — singleton wrapper helper that demands `.get().method()` at
// every callsite. Repos and services don't need lazy initialization (they
// have no constructor work that depends on env / DB at import time); the
// `.get()` indirection is pure call-site noise. If you ever DO need
// genuinely lazy init for something, the lib/singleton.ts helper still
// exists — but don't reach for it for a value that's safe to construct
// at module load.
export const memoriesRepo = singleton(() => new MemoriesRepository());
// callers:
memoriesRepo.get().list(...);  // ← redundant `.get()`
```

### Mechanical rules

1. **Class names** end in `Repository` or `Service` (e.g. `MemoriesRepository`, `MemoryService`). The singleton const drops the suffix and uses the camelCase form (`memoriesRepo`, `memoryService`).
2. **Singleton instantiation** lives at the bottom of the same file as the class: `export const fooRepo = new FooRepository();`. No `singleton()` wrapper unless you have a specific lazy-init reason.
3. **Constructor params** for services are the exact class types they depend on — `private readonly entities: EntitiesRepository`, not `typeof entitiesRepo`. For repos that don't depend on other repos, the constructor is empty (just `class FooRepository {}`).
4. **Tests** instantiate the class directly with mock dependencies: `new MemoryService(mockEntities, mockMemories)`. The exported `memoryService` singleton is what production wires up.
5. **No module-level side effects** in the constructor. Constructors that `await` something or read process.env are a sign you need lazy init — but solve that by deferring the work into a method, not by reintroducing `singleton()`.
