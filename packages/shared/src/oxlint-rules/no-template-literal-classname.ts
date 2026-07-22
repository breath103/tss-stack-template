// Flags a template-literal `className={`...`}`. Use cn() to compose classes.
// (Coding guideline: frontend/use-cn-never-template-literals-for-any-composed.)

interface Node {
  type: string;
  name?: { name?: string };
  value?: { type: string; expression?: { type: string } };
}
interface Context {
  report: (diagnostic: { node: Node; messageId: string }) => void;
}

const rule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow template-literal className — use cn()" },
    messages: {
      templateClassName: "Use cn() instead of a template-literal className.",
    },
    schema: [],
  },
  create(context: Context) {
    return {
      JSXAttribute(node: Node) {
        if (node.name?.name !== "className") return;
        const value = node.value;
        if (
          value?.type === "JSXExpressionContainer" &&
          value.expression?.type === "TemplateLiteral"
        ) {
          context.report({ node, messageId: "templateClassName" });
        }
      },
    };
  },
};

export default rule;
