import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noLodashEs from "./no-lodash-es.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-lodash-es", noLodashEs, {
  valid: [
    { code: 'import mapValues from "lodash.mapvalues";', filename: "t.ts" },
    { code: 'import groupBy from "lodash.groupby";', filename: "t.ts" },
    // Not the barrel — a package that merely starts with the same characters.
    { code: 'import x from "lodash-esque";', filename: "t.ts" },
    { code: 'import { z } from "zod";', filename: "t.ts" },
  ],
  invalid: [
    {
      code: 'import { mapValues } from "lodash-es";',
      filename: "t.ts",
      errors: [{ messageId: "lodashEs" }],
    },
    // Deep imports are still banned here: one package per method is the rule, so
    // the dependency stays declared in package.json rather than implied.
    {
      code: 'import mapValues from "lodash-es/mapValues.js";',
      filename: "t.ts",
      errors: [{ messageId: "lodashEs" }],
    },
    {
      code: 'export { chain } from "lodash-es";',
      filename: "t.ts",
      errors: [{ messageId: "lodashEs" }],
    },
    {
      code: 'export * from "lodash-es";',
      filename: "t.ts",
      errors: [{ messageId: "lodashEs" }],
    },
    {
      code: 'const m = await import("lodash-es");',
      filename: "t.ts",
      errors: [{ messageId: "lodashEs" }],
    },
  ],
});
