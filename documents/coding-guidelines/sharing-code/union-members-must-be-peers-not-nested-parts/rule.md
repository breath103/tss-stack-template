---
topic: Types and schemas
order: 40
---

# When you add a variant to a union, check it cannot appear inside another variant; if it can, it belongs one layer down.

Every member of a discriminated union has to be the same *kind of thing*, at the same
structural layer. Before adding a variant, ask: **can this value appear inside another
variant?** If yes, it is not a sibling — it belongs one layer down, and the union that
would have held it needs to become two unions.

The tell is an **unreachable case**. When a `switch` over the union has a branch whose
comment is some version of *"never happens here"*, the union is wrong. Exhaustiveness
forced you to write that branch, and you satisfied the compiler with a lie instead of
fixing the type. One such branch is a smell; the same branch appearing in every
consumer is proof.

```ts
// ❌ Wrong — `skillCall` is a span INSIDE text, not a peer of a tool step.
// A message is [text, skillCall, text] for a member and [toolCallRequest,
// toolCallResponse, text] for an agent: two different layers, one union.
const contentBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("skillCall"), skillId: z.uuid() }),
  toolCallRequestSchema,
  toolCallResponseSchema,
]);

// …and then, in EVERY consumer, the branch that proves it:
switch (block.type) {
  case "toolCallRequest": return <ToolStep …/>;
  case "skillCall": return null;        // "member-authored; rendered elsewhere, never here"
  case "text":      return <p>{block.text}</p>;
}
```

```ts
// ✅ Correct — split at the seam. Inline nodes live inside a prose block;
// prose blocks and tool steps are what a message holds.
const inlineNodeSchema = z.discriminatedUnion("type", [textNodeSchema, skillCallNodeSchema]);

const paragraphSchema = z.object({
  type: z.literal("paragraph"),
  content: z.array(inlineNodeSchema),
});

const contentBlockSchema = z.discriminatedUnion("type", [
  paragraphSchema,
  toolCallRequestSchema,
  toolCallResponseSchema,
]);

// Every branch is now reachable, and each consumer switches over ONE layer.
```

## Why it is worth the extra type

Layering is not bookkeeping — it makes the wrong states unrepresentable rather than
merely discouraged:

- A tool step cannot appear inside a paragraph, so it can never end up nested in a
  list item or a table cell when those arrive.
- An inline node cannot appear at block level, so nothing can render a bare skill call
  outside the text it was typed into.
- New members go in exactly one place. Adding `list` touches the prose layer and gets
  the whole inline layer — marks, mentions, everything — for free.

Neither invariant needs a comment, a lint rule, or a reviewer to hold. That is the
entire payoff.

## The counter-pressure to resist

Flattening always looks cheaper *at the moment you add the variant*: one union, one
switch, one file touched. The cost lands later and elsewhere — in every consumer that
now carries a dead branch, and in the migration you need when a feature has to tell
the layers apart. Pay the layer up front.

Related: `backend/always-use-switch-for-discriminated-unions` (exhaustiveness is what
surfaces the dead branch in the first place) and
`backend/prefer-discriminated-unions-over-optional-fields`.
