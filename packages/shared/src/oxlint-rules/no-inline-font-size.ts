// Flags inline `fontSize:` style properties. Use text-* scale tokens instead.
// (Coding guideline: frontend/never-use-hardcoded-font-sizes-always-use-the.)

interface Node {
  type: string;
  key?: { type: string; name?: string; value?: unknown };
}
interface Context {
  report: (diagnostic: { node: Node; messageId: string }) => void;
}

const rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Disallow inline fontSize style properties — use text-* tokens" },
    messages: {
      inlineFontSize: "Use the text-* scale tokens; add a named token to global.css if a new step is needed.",
    },
    schema: [],
  },
  create(context: Context) {
    return {
      Property(node: Node) {
        const key = node.key;
        if (
          (key?.type === "Identifier" && key.name === "fontSize") ||
          (key?.type === "Literal" && key.value === "fontSize")
        ) {
          context.report({ node, messageId: "inlineFontSize" });
        }
      },
    };
  },
};

export default rule;
