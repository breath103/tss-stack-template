// Flags `process.env.FOO!` — a non-null-asserted `process.env` read. Declare the
// env var in `src/env.d.ts` with the right type instead of bang-asserting.
import type { Context } from "./plugin-api.ts";

interface Node {
  type: string;
  expression?: {
    type: string;
    object?: { type: string; object?: { type: string; name?: string }; property?: { name?: string } };
    property?: { name?: string };
  };
}

const rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Disallow non-null-asserting `process.env` reads" },
    messages: {
      envBang: "Declare the var in src/env.d.ts with the right type; don't bang-assert process.env.",
    },
    schema: [],
  },
  create(context: Context) {
    return {
      TSNonNullExpression(node: Node) {
        const expr = node.expression;
        if (expr?.type !== "MemberExpression") return;
        const obj = expr.object;
        if (obj?.type !== "MemberExpression") return;
        if (obj.object?.name === "process" && obj.property?.name === "env") {
          context.report({ node, messageId: "envBang" });
        }
      },
    };
  },
};

export default rule;
