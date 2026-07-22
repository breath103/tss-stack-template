import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noDoubleCast from "./no-double-cast.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-double-cast", noDoubleCast, {
  valid: [
    { code: "const x = foo as Bar;", filename: "t.ts" },
    { code: "const x = foo as unknown;", filename: "t.ts" },
    { code: "const x = (foo satisfies Bar);", filename: "t.ts" },
  ],
  invalid: [
    { code: "const x = foo as unknown as Bar;", filename: "t.ts", errors: [{ messageId: "doubleCast" }] },
  ],
});
