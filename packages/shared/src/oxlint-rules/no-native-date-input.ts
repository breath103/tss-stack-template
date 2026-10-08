// Flags `<input type="date">` and `<input type="datetime-local">`. Use
// @/components/ui/Calendar in a Popover/Dialog instead of native date inputs.
// (Coding guideline: frontend/never-input-type-date-time-datetime-local-use.)

interface Node {
  type: string;
  name?: { type: string; name?: string };
  attributes?: Attribute[];
}
interface Attribute {
  type: string;
  name?: { name?: string };
  value?: { type: string; value?: unknown };
}
interface Context {
  report: (diagnostic: { node: Node; messageId: string }) => void;
}

const rule = {
  meta: {
    type: "problem",
    docs: { description: 'Disallow native `<input type="date|datetime-local">`' },
    messages: {
      nativeDateInput: "Use @/components/ui/Calendar in a Popover/Dialog instead of native date inputs.",
    },
    schema: [],
  },
  create(context: Context) {
    return {
      JSXOpeningElement(node: Node) {
        if (node.name?.name !== "input") return;
        for (const attr of node.attributes ?? []) {
          if (attr.type !== "JSXAttribute" || attr.name?.name !== "type") continue;
          const value = attr.value;
          if (value?.type === "Literal" && (value.value === "date" || value.value === "datetime-local")) {
            context.report({ node, messageId: "nativeDateInput" });
          }
        }
      },
    };
  },
};

export default rule;
