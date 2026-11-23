// Flags an array or object literal made only of literals when it is written inside a component
// or hook: `const sizes = ["s", "m"]` in the body, or `[0, 1, 2].map(…)` inline. It uses no prop
// or state, so it is a module-scope constant; N skeleton rows are `Array.from({ length: n }, …)`.
//
// Not flagged: a literal that references any identifier, an empty `[]` / `{}`, and an object
// passed straight to a prop or a call (`style={{ … }}`, `useForm({ mode: "onChange" })`).

import type { Context } from "./plugin-api.ts";

interface Node {
  type: string;
  /** `null` on `Program`. */
  parent: Node | null;
  kind?: string;
  id?: { type: string; name?: string } | null;
  init?: Node | null;
  object?: Node;
  right?: Node;
  expression?: Node;
  argument?: Node;
  operator?: string;
  elements?: (Node | null)[];
  properties?: Node[];
  expressions?: Node[];
  computed?: boolean;
  method?: boolean;
  key?: Node;
  value?: unknown;
}

const FUNCTIONS = new Set(["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"]);
const TYPE_WRAPPERS = new Set(["TSAsExpression", "TSSatisfiesExpression", "ParenthesizedExpression"]);
const COMPONENT_OR_HOOK = /^([A-Z]|use[A-Z])/;

function isStatic(node: Node | null | undefined): boolean {
  if (!node) return false;
  switch (node.type) {
    case "Literal":
      return true;
    case "TemplateLiteral":
      return (node.expressions ?? []).length === 0;
    case "UnaryExpression":
      return node.operator === "-" && isStatic(node.argument);
    case "ArrayExpression":
      return (node.elements ?? []).every(element => isStatic(element));
    case "ObjectExpression":
      return (node.properties ?? []).every(
        property =>
          property.type === "Property" &&
          property.computed !== true &&
          property.method !== true &&
          isStatic(property.value as Node)
      );
    default:
      return TYPE_WRAPPERS.has(node.type) && isStatic(node.expression);
  }
}

function insideComponentOrHook(node: Node): boolean {
  for (let current = node.parent; current !== null; current = current.parent) {
    if (!FUNCTIONS.has(current.type)) continue;
    const name =
      current.id?.name ?? (current.parent?.type === "VariableDeclarator" ? current.parent.id?.name : undefined);
    if (name !== undefined && COMPONENT_OR_HOOK.test(name)) return true;
  }
  return false;
}

/** The node one step out, past `as const`, `satisfies T` and parentheses. */
function unwrappedParent(node: Node): { parent: Node | null; child: Node } {
  let child = node;
  while (child.parent !== null && TYPE_WRAPPERS.has(child.parent.type)) child = child.parent;
  return { parent: child.parent, child };
}

const rule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow literal-only arrays and objects declared inside a component or hook" },
    messages: {
      hoist:
        "This literal uses no prop, state or local, so it is rebuilt on every render for nothing. Move it to a module-scope `const` above the component. To render N placeholder rows write `Array.from({ length: n }, (_, index) => …)`, not `[0, 1, 2].map`.",
    },
    schema: [],
  },
  create(context: Context) {
    function check(node: Node) {
      const size = node.type === "ArrayExpression" ? node.elements?.length : node.properties?.length;
      if (size === undefined || size === 0 || !isStatic(node)) return;
      const { parent, child } = unwrappedParent(node);
      if (parent === null) return;
      const declared = parent.type === "VariableDeclarator" && parent.init === child && parent.parent?.kind === "const";
      const iterated =
        node.type === "ArrayExpression" &&
        ((parent.type === "MemberExpression" && parent.object === child) ||
          (parent.type === "ForOfStatement" && parent.right === child));
      if ((declared || iterated) && insideComponentOrHook(node)) context.report({ node, messageId: "hoist" });
    }
    return { ArrayExpression: check, ObjectExpression: check };
  },
};

export default rule;
