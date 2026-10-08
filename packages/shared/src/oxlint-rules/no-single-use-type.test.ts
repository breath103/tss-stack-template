import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noSingleUseType from "./no-single-use-type.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-single-use-type", noSingleUseType, {
  valid: [
    { code: "type T = { a: number }; const x: T = { a: 1 }; const y: T = { a: 2 };", filename: "t.ts" },
    { code: "export type T = { a: number }; const x: T = { a: 1 };", filename: "t.ts" },
    { code: "type T = { a: number };", filename: "t.ts" },
    { code: "type Tree = { kids: Tree[] };", filename: "t.ts" },
  ],
  invalid: [
    { code: "type T = { a: number }; const x: T = { a: 1 };", filename: "t.ts", errors: [{ messageId: "singleUse" }] },
    {
      code: "interface I { a: number } const x: I = { a: 1 };",
      filename: "t.ts",
      errors: [{ messageId: "singleUse" }],
    },
    {
      code: "type Tree = { kids: Tree[] }; const t: Tree = { kids: [] };",
      filename: "t.ts",
      errors: [{ messageId: "singleUse" }],
    },
  ],
});
