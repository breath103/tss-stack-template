// Flags a NON-exported `type` alias or `interface` that is referenced exactly
// once. A name used a single time splits the shape from its use and reads like
// the start of an abstraction that never comes — inline it at the one callsite.
// Lives in `shared` (dev-only lint tooling, never bundled); loaded as an oxlint
// JS plugin (`local`) by the backend and frontend `.oxlintrc.json`.
// (Coding guideline: frontend/don-t-name-a-type-you-use-once, and its backend
// sibling backend/inline-single-use-schemas-and-variables.)
//
// Scope is deliberately limited to non-exported declarations: an exported type
// can be referenced in other files, which a per-file lint rule can't see, so we
// leave those to knip (unused exports) + review. Zero-reference declarations
// are `no-unused-vars` territory, not this rule — we only fire on exactly one.
//
// Self-references (recursive types like `type Tree = { kids: Tree[] }`) are
// excluded by counting only references that sit OUTSIDE the declaration's own
// range, so a recursive type with one external use still counts as one.

// oxlint's JS-plugin author types aren't exported from `oxlint/plugins-dev`, so
// we model the minimal surface this rule touches.
interface Node {
  type: string;
  range: [number, number];
  parent?: { type: string } | null;
  declare?: boolean;
  id: { name: string };
}
interface Variable {
  references: { identifier: { range?: [number, number] } }[];
  defs: unknown[];
}
interface Context {
  sourceCode: { getDeclaredVariables: (node: Node) => Variable[] };
  report: (diagnostic: { node: Node; messageId: string; data?: Record<string, string> }) => void;
}

function isExported(node: Node): boolean {
  const parent = node.parent;
  return parent?.type === "ExportNamedDeclaration" || parent?.type === "ExportDefaultDeclaration";
}

function externalReferenceCount(variable: Variable, declRange: [number, number]): number {
  return variable.references.filter(ref => {
    const [start, end] = ref.identifier.range ?? [0, 0];
    return start < declRange[0] || end > declRange[1];
  }).length;
}

function check(context: Context, node: Node): void {
  if (node.declare || isExported(node)) return;

  const [variable] = context.sourceCode.getDeclaredVariables(node);
  // Declaration merging (multiple defs for one name) → don't touch.
  if (!variable || variable.defs.length > 1) return;

  if (externalReferenceCount(variable, node.range) === 1) {
    context.report({ node, messageId: "singleUse", data: { name: node.id.name } });
  }
}

const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow a non-exported type/interface that is used only once — inline it instead",
    },
    messages: {
      singleUse:
        "`{{name}}` is used only once — inline the type at its single use site instead of naming it (don't-name-a-type-you-use-once).",
    },
    schema: [],
  },
  create(context: Context) {
    return {
      TSTypeAliasDeclaration: (node: Node) => check(context, node),
      TSInterfaceDeclaration: (node: Node) => check(context, node),
    };
  },
};

export default rule;
