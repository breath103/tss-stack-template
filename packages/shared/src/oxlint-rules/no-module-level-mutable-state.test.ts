import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noModuleLevelMutableState from "./no-module-level-mutable-state.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-module-level-mutable-state", noModuleLevelMutableState, {
  valid: [
    // `const` is the singleton pattern, mutable contents and all.
    { code: "const running = new Set();", filename: "t.ts" },
    { code: "export const repo = new Repo();", filename: "t.ts" },
    // Mutable state scoped to where it is used.
    { code: "function f() { let i = 0; return i; }", filename: "t.ts" },
    { code: "describe('x', () => { let subject; beforeEach(() => { subject = make(); }); });", filename: "t.ts" },
    { code: "class C { run() { let seen = new Set(); return seen; } }", filename: "t.ts" },
    { code: "for (let i = 0; i < 3; i++) {}", filename: "t.ts" },
    // A declared ambient binding is not state this file owns.
    { code: "declare let globalThing: string;", filename: "t.ts" },
    // The deliberate opt-out.
    { code: "// singleton: lazily-built JWKS, one per process\nlet jwks = null;", filename: "t.ts" },
  ],
  invalid: [
    {
      code: "let nextId = 0;",
      filename: "t.ts",
      errors: [{ messageId: "moduleLevelMutable" }],
    },
    {
      code: "var installed = false;",
      filename: "t.ts",
      errors: [{ messageId: "moduleLevelMutable" }],
    },
    {
      code: "export let current = null;",
      filename: "t.ts",
      errors: [{ messageId: "moduleLevelMutable" }],
    },
    // A test fixture — the case that motivated the rule.
    {
      code: "let skill;\ndescribe('x', () => { beforeEach(() => { skill = make(); }); });",
      filename: "t.test.ts",
      errors: [{ messageId: "moduleLevelMutable" }],
    },
    // An opt-out further up the file does not cover a later declaration.
    {
      code: "// singleton: fine\nlet a = 1;\nlet b = 2;",
      filename: "t.ts",
      errors: [{ messageId: "moduleLevelMutable" }],
    },
  ],
});
