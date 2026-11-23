// oxlint's JS-plugin author types aren't exported from `oxlint/plugins-dev`, so each
// rule models the minimal surface it touches. The shapes below were declared
// identically in file after file — `Context` in 13 of them — which nothing noticed
// because this package was linted by no CI job until now.
//
// `Node` deliberately stays per-rule: each rule reads different AST fields, and a
// union of every field any rule needs would type-check accesses that are wrong for
// the node at hand. Only the node's `type` discriminant is needed here.

/** The `report`-only slice of oxlint's rule context — what most rules need. */
export interface Context {
  report: (diagnostic: { node: { type: string }; messageId: string; data?: Record<string, string> }) => void;
}

/**
 * A variable as returned by `sourceCode.getDeclaredVariables`.
 *
 * All three fields are required because oxlint really does supply all three — the
 * two rules using this each read a different subset (`no-single-use-type` wants
 * `defs`, `no-class-scoped-module-const` wants `name`), which is why they had
 * drifted into two incompatible local models of one API.
 */
export interface Variable {
  name: string;
  references: { identifier: { range?: [number, number] } }[];
  defs: unknown[];
}

/** For rules that need scope analysis on top of `report`. */
export interface ScopedContext extends Context {
  sourceCode: {
    getDeclaredVariables: (node: { type: string }) => Variable[];
    /** Whole-file source. Rules reading it should slice by a node's own `range`. */
    getText: () => string;
  };
}
