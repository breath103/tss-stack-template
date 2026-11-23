// Flags raw `fetch("/...")` calls to our own API. Use api.fetch instead.
// (Coding guideline: frontend/use-apiclient-for-api-calls.)

import type { Context } from "./plugin-api.ts";

interface Node {
  type: string;
  callee?: { type: string; name?: string };
  arguments?: Array<{ type: string; value?: unknown }>;
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
