// Flags a mutable binding at MODULE scope (`let` / `var` outside any function,
// class or block). Module-level mutable state is shared by every importer and
// every test in the file, and nothing in the type system says who may write it.
//
// The fix is almost always to move it inward: into the function that uses it,
// into the `describe` block whose `beforeEach` assigns it, or onto the class it
// belongs to. `const` is untouched — a module-level `const` holding a mutable
// object (a registry Set, a repository instance) is the singleton pattern and is
// deliberately allowed.
//
// The genuine exceptions are process-wide singletons: a lazily-initialised cache,
// a one-time install flag, a counter behind an allocator. Those opt out with a
// `// singleton: <reason>` comment on the line above, mirroring the `// scope:`
// opt-out used by the comment-visibility rule. The reason is the point — it makes
// the author say why the state is process-wide, which is the whole decision.

import type { ScopedContext } from "./plugin-api.ts";

interface Node {
  type: string;
  kind?: string;
  range: [number, number];
  parent?: { type: string } | null;
  declare?: boolean;
}

// A declaration is module-level when its parent is the Program itself, or an
// `export` wrapper sitting directly in the Program.
function isModuleLevel(node: Node): boolean {
  const parentType = node.parent?.type;
  return (
    parentType === "Program" || parentType === "ExportNamedDeclaration" || parentType === "ExportDefaultDeclaration"
  );
}

const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow module-level `let`/`var` — move the state inward, or mark a real singleton",
    },
    messages: {
      moduleLevelMutable:
        "`{{name}}` is mutable state at module scope, shared by every importer. Move it into the function, `describe` block, or class that owns it. If it is a real process-wide singleton, say so with a `// singleton: <reason>` comment above it.",
    },
    schema: [],
  },
  create(context: ScopedContext) {
    return {
      VariableDeclaration(node: Node) {
        if (node.declare || node.kind === "const") return;
        if (!isModuleLevel(node)) return;

        const source = context.sourceCode;
        const before = source.getText().slice(0, node.range[0]);
        // Only the comment immediately above counts, so an opt-out cannot be
        // inherited from something further up the file.
        const previousLine = before.trimEnd().split("\n").at(-1) ?? "";
        if (previousLine.trimStart().startsWith("// singleton:")) return;

        for (const variable of source.getDeclaredVariables(node)) {
          context.report({ node, messageId: "moduleLevelMutable", data: { name: variable.name } });
        }
      },
    };
  },
};

export default rule;
