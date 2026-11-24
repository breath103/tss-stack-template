// Flags a template-literal `className={`...`}`. Use cn() to compose classes.
import type { Context } from "./plugin-api.ts";

interface Node {
  type: string;
  name?: { name?: string };
  value?: { type: string; expression?: { type: string } };
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
        if (value?.type === "JSXExpressionContainer" && value.expression?.type === "TemplateLiteral") {
          context.report({ node, messageId: "templateClassName" });
        }
      },
    };
  },
};

export default rule;
