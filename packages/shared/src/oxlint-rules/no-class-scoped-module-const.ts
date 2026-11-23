// Flags a NON-exported module-level `const` whose every reference sits inside a
// single class body. That constant is not module state — it is that class's
// tuning knob, and leaving it at module scope invites the next reader to treat
// it as shared and to add a second consumer that has nothing to do with the
// class. Move it in as a `private static readonly` member (or inline it at its
// one use site, if it is used once).
//
//   ❌  const RUN_CODE_TIMEOUT_MS = 20_000;
//       export class SandboxTools { … runCode(src, { timeoutMs: RUN_CODE_TIMEOUT_MS }) … }
//
//   ✅  export class SandboxTools {
//         /** Generous because tool runtimes make network calls. */
//         private static readonly RUN_CODE_TIMEOUT_MS = 20_000;
//       }
//
// Deliberately narrow, so a hit is always a real move:
//   - an exported const is skipped — another file may import it, which a
//     per-file rule cannot see (the declaration is an ExportNamedDeclaration,
//     so the VariableDeclaration check below never matches it);
//   - a const referenced from anywhere outside the class (module scope, a
//     helper function, a second class) is skipped — it IS shared;
//   - zero-reference consts are `no-unused-vars` territory;
//   - only `const` — a reassigned module-level `let` is mutable module state, a
//     different smell with a different fix;
//   - destructured declarations have no single name to move.

import type { ScopedContext } from "./plugin-api.ts";

// oxlint's JS-plugin author types aren't exported from `oxlint/plugins-dev`, so
// we model the minimal surface this rule touches. `Node` is rule-specific; the
// context/variable shapes are shared — see `plugin-api.ts`.
interface Node {
  type: string;
  range: [number, number];
  kind?: string;
  body?: Node[];
  declaration?: Node;
  declarations?: { id?: { type: string } }[];
  id?: { name?: string };
}

/** Top-level classes, including `export`ed and `export default` ones. */
function topLevelClasses(program: Node): { name: string; range: [number, number] }[] {
  return (program.body ?? [])
    .map(statement =>
      statement.type === "ExportNamedDeclaration" || statement.type === "ExportDefaultDeclaration"
        ? statement.declaration
        : statement
    )
    .filter((statement): statement is Node => statement?.type === "ClassDeclaration")
    .map(statement => ({ name: statement.id?.name ?? "the class", range: statement.range }));
}

function isInside(reference: { identifier: { range?: [number, number] } }, [start, end]: [number, number]): boolean {
  const range = reference.identifier.range;
  return range !== undefined && range[0] >= start && range[1] <= end;
}

const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow a module-level const used only inside one class — make it a private static member",
    },
    messages: {
      classScoped:
        "`{{name}}` is only used inside `class {{className}}` — declare it there as `private static readonly {{name}}`, not at module scope.",
    },
    schema: [],
  },
  create(context: ScopedContext) {
    return {
      Program(program: Node) {
        const classes = topLevelClasses(program);
        if (classes.length === 0) return;

        for (const statement of program.body ?? []) {
          if (statement.type !== "VariableDeclaration" || statement.kind !== "const") continue;
          if (statement.declarations?.some(d => d.id?.type !== "Identifier") === true) continue;

          for (const variable of context.sourceCode.getDeclaredVariables(statement)) {
            // `references` includes the declaration's own identifier (the init write), which by
            // definition sits outside the class — count only the reads elsewhere in the file.
            const uses = variable.references.filter(ref => !isInside(ref, statement.range));
            if (uses.length === 0) continue;
            const owner = classes.find(({ range }) => uses.every(ref => isInside(ref, range)));
            if (owner === undefined) continue;
            context.report({
              node: statement,
              messageId: "classScoped",
              data: { name: variable.name, className: owner.name },
            });
          }
        }
      },
    };
  },
};

export default rule;
