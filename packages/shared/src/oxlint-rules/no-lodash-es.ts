// Flags `lodash-es` imports in code that ships to the Lambda.
//
// `lodash-es` is a barrel: its index re-exports all ~640 method modules, and
// Node's ESM loader has no tree-shaking. `import { mapValues } from "lodash-es"`
// therefore loaded all 640 files at runtime to get one function — measurably, it
// was 640 of the 1,868 modules the cold start resolved.
//
// Bundling (scripts/build.ts) tree-shakes this away for the Lambda itself, but
// the barrel is still wrong here: it slows every unbundled consumer (tsx dev
// server, scripts, tests) and silently re-inflates the graph the moment anything
// in this closure is loaded without the bundler. Use the split `lodash.<method>`
// packages instead.
//
// Deliberately NOT enabled for `packages/frontend` / `modules/ui`: those are
// bundled by Vite, which tree-shakes at build time — `lodash-es` is the correct
// choice there and the split packages would make the bundle worse.

import type { Context } from "./plugin-api.ts";

interface Node {
  type: string;
  value?: string;
}

/** `lodash-es` itself, or any deep path into it (`lodash-es/mapValues.js`). */
function isLodashEs(source: string): boolean {
  return source === "lodash-es" || source.startsWith("lodash-es/");
}

/** `lodash-es/mapValues.js` → `lodash.mapvalues`; bare barrel → a generic hint. */
function suggestion(source: string): string {
  const method = source.slice("lodash-es/".length).replace(/\.(js|mjs)$/, "");
  return method ? `lodash.${method.toLowerCase()}` : "lodash.<method>";
}

const rule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow lodash-es (a barrel) outside bundled frontend code" },
    messages: {
      lodashEs:
        'Don\'t import "{{source}}" here — lodash-es is a barrel and Node ESM has no tree-shaking, so it pulls ~640 modules in unbundled contexts. Use the split package "{{suggested}}" (+ its @types) instead.',
    },
    schema: [],
  },
  create(context: Context) {
    const check = (node: { source?: Node }) => {
      const source = node.source;
      if (source?.value && isLodashEs(source.value)) {
        context.report({
          node: source,
          messageId: "lodashEs",
          data: { source: source.value, suggested: suggestion(source.value) },
        });
      }
    };

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
      ImportExpression: check,
    };
  },
};

export default rule;
