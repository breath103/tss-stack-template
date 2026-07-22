import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noEntitiesIndex from "./no-entities-index.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-entities-index", noEntitiesIndex, {
  valid: [
    { code: "type A = Entities[Table];", filename: "t.ts" },
    { code: "type B = Foo[\"x\"];", filename: "t.ts" },
  ],
  invalid: [
    { code: "type Task = Entities[\"tasks\"];", filename: "t.ts", errors: [{ messageId: "entitiesIndex" }] },
  ],
});
