// Flags supabase `.select("*")`. Use `.select()` (no arg) for the all-columns
// case, or `.select("col1, col2")` for a real projection.
// (Coding guideline: backend/use-select-not-select-for-the-all-columns.)

interface Node {
  type: string;
  callee?: { type: string; property?: { name?: string } };
  arguments?: { type: string; value?: unknown }[];
}
interface Context {
  report: (diagnostic: { node: Node; messageId: string }) => void;
}

const rule = {
  meta: {
    type: "suggestion",
    requires: "supabase",
    docs: { description: 'Disallow `.select("*")` — use `.select()` or a real projection' },
    messages: {
      selectStar: 'Use .select() (no arg) for the all-columns case, or .select("col1, col2") for a real projection.',
    },
    schema: [],
  },
  create(context: Context) {
    return {
      CallExpression(node: Node) {
        if (node.callee?.type !== "MemberExpression") return;
        if (node.callee.property?.name !== "select") return;
        // `.select("*", { count, head })` is a legitimate count query — only the
        // bare all-columns fetch `.select("*")` is the smell.
        if (node.arguments?.length !== 1) return;
        if (node.arguments[0].value === "*") {
          context.report({ node, messageId: "selectStar" });
        }
      },
    };
  },
};

export default rule;
