import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noSelectStar from "./no-select-star.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-select-star", noSelectStar, {
  valid: [
    { code: "q.select();", filename: "t.ts" },
    { code: 'q.select("id, name");', filename: "t.ts" },
    { code: "q.select(cols);", filename: "t.ts" },
    { code: 'q.select("*", { count: "exact", head: true });', filename: "t.ts" },
  ],
  invalid: [{ code: 'q.select("*");', filename: "t.ts", errors: [{ messageId: "selectStar" }] }],
});
