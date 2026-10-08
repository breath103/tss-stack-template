import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noInlineDatabaseRowType from "./no-inline-database-row-type.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-inline-database-row-type", noInlineDatabaseRowType, {
  valid: [
    { code: 'type A = Foo["bar"];', filename: "t.ts" },
    { code: 'type B = Other["x"]["y"];', filename: "t.ts" },
  ],
  invalid: [
    {
      code: 'type Row = Database["public"]["Tables"]["tasks"]["Row"];',
      filename: "t.ts",
      errors: [{ messageId: "inlineRowType" }],
    },
  ],
});
