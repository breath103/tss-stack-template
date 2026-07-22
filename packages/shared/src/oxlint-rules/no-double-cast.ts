// Flags the `x as unknown as T` double-cast escape hatch. Fix the source type,
// or narrow at runtime / use `satisfies` — don't launder one type into another
// through `unknown`. Suppress a justified framework-boundary cast with an inline
// `// oxlint-disable-next-line local/no-double-cast`.
// (Coding guidelines: backend/never-force-cast-with-as-use-satisfies-or,
// frontend/avoid-unknown-and-as-casts-use-generics-and.)

interface Node {
  type: string;
  expression?: { type: string; typeAnnotation?: { type: string } };
}
interface Context {
  report: (diagnostic: { node: Node; messageId: string }) => void;
}

const rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Disallow `as unknown as` double casts" },
    messages: {
      doubleCast: "Drop the `as unknown as` double-cast; fix the source type or use satisfies / runtime narrowing.",
    },
    schema: [],
  },
  create(context: Context) {
    return {
      TSAsExpression(node: Node) {
        const inner = node.expression;
        if (inner?.type === "TSAsExpression" && inner.typeAnnotation?.type === "TSUnknownKeyword") {
          context.report({ node, messageId: "doubleCast" });
        }
      },
    };
  },
};

export default rule;
