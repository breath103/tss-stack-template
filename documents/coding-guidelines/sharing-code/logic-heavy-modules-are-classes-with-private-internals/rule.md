---
topic: Code structure
order: 10
---

# When a module has several internal steps or functions that share the same arguments, make it one class with one public method and private steps.

When a module does one logically complete job that takes a lot of internal steps, write
it as a **class**. The finished operation is a public method; every step it is built out
of is a **private method**. Not a file of exported helpers with one "main" function among
them.

The test is not "is this object-oriented" — it is **how many names does a caller need to
know?** One logically complete job means one public name. If the caller has to import
four functions and call them in the right order, the module never had a boundary; it had
a pile of helpers and the sequencing leaked into everyone who used it.

```ts
// ❌ Wrong — six exports for one job, and the caller has to know the choreography.
export function messagesUpToCutoff(history, trigger) { … }
export function invokedSkillIds(rows) { … }
export function buildContext(rows, skills) { … }
export const MAX_TOOL_HISTORY_TURNS = 3;
export type SkillDefinition = { … };
export type Context = LlmMessage[];

// …and at every call site, the module's own sequencing, re-assembled by hand:
const rows = messagesUpToCutoff(await repo.listMessages(id), trigger);
const skills = await skillsRepo.byIds(orgId, invokedSkillIds(rows));
const messages = buildContext(rows, new Map(skills.map(s => [s.id, s])));
```

```ts
// ✅ Correct — one public method. The steps are private; the order is not the
// caller's problem, and cannot be got wrong.
export class Context {
  constructor(private readonly reads: {
    loadMessages: () => Promise<Pick<AgentSessionMessageRow, "data">[]>;
    loadSkills: (ids: string[]) => Promise<{ id: string; name: string; prompt: string }[]>;
  }) {}

  async build(): Promise<LlmMessage[]> { … }

  private proseToText(prose): string { … }
  private skillIdsIn(content): string[] { … }
}

// The call site is the whole contract:
const messages = await new Context({
  loadMessages: () => agentSessionsRepo.listMessages(session.id),
  loadSkills: ids => skillsRepo.byIds(session.org_id, ids),
}).build();
```

A private method is also the honest home for a step that exists only because this job is
complicated. Module scope says "anyone may call this"; `private` says "this is how the
job is done." Only the second one is true, and the compiler will hold you to it.

## Testing does NOT get a vote on the export list

**Never widen a module's public surface because a test wants at an internal step.** An
export that exists for a test is a lie about the module's boundary, and it is permanent —
the next author reads six exports and reasonably wires up to any of them. Exports are for
callers. There are exactly two legitimate seams:

**1. Inject every external dependency through the constructor.** Anything the job cannot
do itself — a DB read, an HTTP call, the clock — arrives as a function on the constructor
argument. Then the whole class is testable through its public method with no database,
no server, and no module mocking, which tests the real contract rather than the plumbing.

```ts
// The whole crossing, driven exactly the way production drives it.
const messages = await new Context({
  loadMessages: () => Promise.resolve(rows),
  loadSkills: ids => Promise.resolve(SKILLS.filter(s => ids.includes(s.id))),
}).build();
```

**2. If one internal step is genuinely complex enough to deserve direct tests, make it a
`public static` pure function.** Static says it needs no instance state; public says it is
a deliberate part of the surface, not a leak. This is the *exception* — reach for it when a step has real
combinatorial depth of its own (calendar/DST math, a parser), not to avoid writing a case
through the public method.

What both seams have in common: the public surface still describes the job. A private
method exported "just for the test" describes nothing.

## When this does NOT apply

- A module that really is one function (`markdown-to-text.ts`). One job, one step, no
  internal procedure — a class would be ceremony.
- A module of genuinely independent utilities with no shared job between them.
- A pure vocabulary/schema module whose exports ARE the product (`sandbox.ts`).

Related: `backend/extract-pure-logic-into-its-own-module-and-unit-test` (WHAT to pull out
of a handler — this rule is HOW to shape it once pulled) and
`backend/repos-and-services-are-singleton-classes-deps-injected`.
