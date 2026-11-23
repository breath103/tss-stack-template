// Flags `const [value] = useState(…)`: state whose setter is never taken is a
// once-per-mount value, which is `useMemo(() => …, [])`.

import type { Context } from "./plugin-api.ts";

interface Node {
  type: string;
  id?: { type: string; elements?: unknown[] };
  init?: { type: string; callee?: { type: string; name?: string; property?: { name?: string } } } | null;
}

const rule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow `useState` destructured without its setter" },
    messages: {
      setterless:
        "`useState` without a setter is not state. Use `useMemo(() => initial, [])` for a value computed once per mount.",
    },
    schema: [],
  },
  create(context: Context) {
    return {
      VariableDeclarator(node: Node) {
        if (node.id?.type !== "ArrayPattern" || node.id.elements?.length !== 1) return;
        const callee = node.init?.type === "CallExpression" ? node.init.callee : undefined;
        const name = callee?.type === "MemberExpression" ? callee.property?.name : callee?.name;
        if (name === "useState") context.report({ node, messageId: "setterless" });
      },
    };
  },
};

export default rule;
