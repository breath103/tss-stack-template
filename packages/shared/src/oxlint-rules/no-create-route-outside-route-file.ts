// Flags `createRoute(…)` in any file not named `_route.tsx`. TanStack routes are
// defined by hand, one `_route.tsx` per URL-segment directory, so a route declared
// in a component file is invisible to anyone walking `src/routes/`.

import path from "node:path";

import type { Context } from "./plugin-api.ts";

interface Node {
  type: string;
  callee?: { type: string; name?: string };
}

const rule = {
  meta: {
    type: "problem",
    docs: { description: "`createRoute` is only called from a `_route.tsx` file" },
    messages: {
      outsideRouteFile:
        "Define this route in `_route.tsx` inside the directory that mirrors its URL segment, and import the parent route by relative path (`../_route`).",
    },
    schema: [],
  },
  create(context: Context & { filename: string }) {
    if (path.basename(context.filename) === "_route.tsx") return {};
    return {
      CallExpression(node: Node) {
        if (node.callee?.type === "Identifier" && node.callee.name === "createRoute") {
          context.report({ node, messageId: "outsideRouteFile" });
        }
      },
    };
  },
};

export default rule;
