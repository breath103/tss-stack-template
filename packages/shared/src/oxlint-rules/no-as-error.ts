// Flags `x as Error` casts. Extract the message with a runtime check —
// `err instanceof Error ? err.message : String(err)` — instead of asserting the
// caught value's type, which the compiler cannot verify.
// (Coding guideline: backend/extract-error-messages-with-instanceof-error-not-as.)

interface Node {
  type: string;
  typeAnnotation?: { type: string; typeName?: { type: string; name?: string } };
}
interface Context {
  report: (diagnostic: { node: Node; messageId: string }) => void;
}

const rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Disallow `as Error` casts — narrow with `instanceof Error` instead" },
    messages: {
      asError: "Use `err instanceof Error ? err.message : String(err)` instead of `err as Error`.",
    },
    schema: [],
  },
  create(context: Context) {
    return {
      TSAsExpression(node: Node) {
        const ann = node.typeAnnotation;
        if (ann?.type === "TSTypeReference" && ann.typeName?.name === "Error") {
          context.report({ node, messageId: "asError" });
        }
      },
    };
  },
};

export default rule;
