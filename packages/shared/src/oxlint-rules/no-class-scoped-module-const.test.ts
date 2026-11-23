import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noClassScopedModuleConst from "./no-class-scoped-module-const.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-class-scoped-module-const", noClassScopedModuleConst, {
  valid: [
    // Referenced outside the class too — genuinely module-level.
    {
      code: "const MS = 20_000; class A { run() { return MS; } } export function wait() { return MS; }",
      filename: "t.ts",
    },
    // Shared by two classes.
    { code: "const MS = 20_000; class A { run() { return MS; } } class B { run() { return MS; } }", filename: "t.ts" },
    // Exported — another file may import it; a per-file rule can't judge that.
    { code: "export const MS = 20_000; class A { run() { return MS; } }", filename: "t.ts" },
    // No class in the file at all.
    { code: "const MS = 20_000; export function wait() { return MS; }", filename: "t.ts" },
    // Unused — no-unused-vars territory, not ours.
    { code: "const MS = 20_000; class A { run() { return 1; } }", filename: "t.ts" },
    // Mutable module state is a different smell with a different fix.
    { code: "let count = 0; class A { run() { return count; } }", filename: "t.ts" },
    // Already where it belongs.
    { code: "class A { private static readonly MS = 20_000; run() { return A.MS; } }", filename: "t.ts" },
    // Destructured — no single name to move.
    { code: "const { MS } = config; class A { run() { return MS; } }", filename: "t.ts" },
  ],
  invalid: [
    {
      code: "const MS = 20_000; class A { run() { return MS; } }",
      filename: "t.ts",
      errors: [{ messageId: "classScoped" }],
    },
    // Multiple references, all inside the one class.
    {
      code: "const MS = 20_000; export class A { run() { return MS; } retry() { return MS * 2; } }",
      filename: "t.ts",
      errors: [{ messageId: "classScoped" }],
    },
    // Two class-only consts → two reports.
    {
      code: "const MS = 20_000; const MAX = 1024; class A { run() { return MS + MAX; } }",
      filename: "t.ts",
      errors: [{ messageId: "classScoped" }, { messageId: "classScoped" }],
    },
    {
      code: "const MS = 20_000; export default class A { run() { return MS; } }",
      filename: "t.ts",
      errors: [{ messageId: "classScoped" }],
    },
  ],
});
