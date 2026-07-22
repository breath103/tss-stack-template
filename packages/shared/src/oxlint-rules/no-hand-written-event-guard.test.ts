import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noHandWrittenEventGuard from "./no-hand-written-event-guard.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-hand-written-event-guard", noHandWrittenEventGuard, {
  valid: [
    { code: "function isFoo() { return true; }", filename: "t.ts" },
    { code: "function handleEvent() {}", filename: "t.ts" },
    { code: "const isClickEvent = () => true;", filename: "t.ts" },
  ],
  invalid: [
    {
      code: "function isClickEvent(x: unknown) { return true; }",
      filename: "t.ts",
      errors: [{ messageId: "handWrittenGuard" }],
    },
    {
      code: "function isDragEvent() { return false; }",
      filename: "t.ts",
      errors: [{ messageId: "handWrittenGuard" }],
    },
  ],
});
