// Flags raw `fetch("/...")` calls to our own API. Use api.fetch instead.
// (Coding guideline: frontend/use-apiclient-for-api-calls.)

interface Node {
  type: string;
  callee?: { type: string; name?: string };
  arguments?: Array<{ type: string; value?: unknown }>;
}
interface Context {
  report: (diagnostic: { node: Node; messageId: string }) => void;
}

const rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Disallow raw fetch() to our own API — use api.fetch" },
    messages: {
      rawFetch: "Use api.fetch from @/lib/api-client instead of raw fetch().",
    },
    schema: [],
  },
  create(context: Context) {
    return {
      CallExpression(node: Node) {
        if (node.callee?.type !== "Identifier" || node.callee.name !== "fetch") return;
        const first = node.arguments?.[0];
        if (first?.type === "Literal" && typeof first.value === "string" && first.value.startsWith("/")) {
          context.report({ node, messageId: "rawFetch" });
        }
      },
    };
  },
};

export default rule;
