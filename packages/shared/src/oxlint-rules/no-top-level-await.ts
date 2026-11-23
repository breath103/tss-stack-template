// Flags top-level `await` / `for await` (including a top-level `await import()`).
// Switched on for `**/scripts/**`: a rejected top-level await in an entry point has
// no handler, and tsx's dynamic-import lexer throws a bogus `Parse error <file>:2:113`
// on files that use `await import()` at module level.

import type { Context } from "./plugin-api.ts";

interface Node {
  type: string;
  await?: boolean;
  parent?: Node | null;
}

const FUNCTIONS = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);

function isTopLevel(node: Node): boolean {
  for (let current = node.parent; current; current = current.parent) {
    if (FUNCTIONS.has(current.type)) return false;
  }
  return true;
}

const rule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow top-level await in entry-point scripts" },
    messages: {
      topLevelAwait:
        "No top-level `await`. Wrap the script body in `async function main()` and end the file with `main().catch(err => { console.error(err); process.exit(1); })`; turn a top-level `await import()` into a static import.",
    },
    schema: [],
  },
  create(context: Context) {
    return {
      AwaitExpression(node: Node) {
        if (isTopLevel(node)) context.report({ node, messageId: "topLevelAwait" });
      },
      ForOfStatement(node: Node) {
        if (node.await === true && isTopLevel(node)) context.report({ node, messageId: "topLevelAwait" });
      },
    };
  },
};

export default rule;
