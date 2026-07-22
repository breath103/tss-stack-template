import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noNativeDateInput from "./no-native-date-input.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-native-date-input", noNativeDateInput, {
  valid: [
    { code: "const x = <input type=\"time\" />;", filename: "t.tsx" },
    { code: "const x = <input type=\"text\" />;", filename: "t.tsx" },
  ],
  invalid: [
    {
      code: "const x = <input type=\"date\" />;",
      filename: "t.tsx",
      errors: [{ messageId: "nativeDateInput" }],
    },
    {
      code: "const x = <input type=\"datetime-local\" />;",
      filename: "t.tsx",
      errors: [{ messageId: "nativeDateInput" }],
    },
  ],
});
