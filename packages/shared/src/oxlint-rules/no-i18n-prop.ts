// Flags passing an `i18n={...}` object prop into a component. Pass resolved
// strings, or give the component its own colocated *.i18n.json.
// (Coding guideline: frontend/shared-components-localize-internally-never-take-an-i18n-object.)

interface Node {
  type: string;
  name?: { name?: string };
  value?: { type: string };
}
interface Context {
  report: (diagnostic: { node: Node; messageId: string }) => void;
}

const rule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow passing an i18n object prop into a component" },
    messages: {
      i18nProp:
        "Don't pass an i18n object into a component — pass resolved strings, or give the component its own colocated *.i18n.json and call useI18n(dict) inside it.",
    },
    schema: [],
  },
  create(context: Context) {
    return {
      JSXAttribute(node: Node) {
        if (node.name?.name !== "i18n") return;
        if (node.value?.type === "JSXExpressionContainer") {
          context.report({ node, messageId: "i18nProp" });
        }
      },
    };
  },
};

export default rule;
