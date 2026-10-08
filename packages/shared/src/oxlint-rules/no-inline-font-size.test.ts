import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noInlineFontSize from "./no-inline-font-size.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-inline-font-size", noInlineFontSize, {
  valid: [
    { code: 'const o = { color: "red" };', filename: "t.ts" },
    { code: "const o = { size: 10 };", filename: "t.ts" },
  ],
  invalid: [
    { code: "const s = { fontSize: 12 };", filename: "t.ts", errors: [{ messageId: "inlineFontSize" }] },
    { code: 'const s = { fontSize: "1rem" };', filename: "t.ts", errors: [{ messageId: "inlineFontSize" }] },
  ],
});
