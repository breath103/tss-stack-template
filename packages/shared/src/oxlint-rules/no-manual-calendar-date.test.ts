import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noManualCalendarDate from "./no-manual-calendar-date.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-manual-calendar-date", noManualCalendarDate, {
  valid: [
    { code: "const t = d.getTime();", filename: "t.ts" },
    { code: "const s = d.toISOString();", filename: "t.ts" },
    { code: 'const s = "2020-01-01";', filename: "t.ts" },
  ],
  invalid: [
    { code: "const y = d.getFullYear();", filename: "t.ts", errors: [{ messageId: "manualDate" }] },
    { code: "const m = d.getUTCMonth();", filename: "t.ts", errors: [{ messageId: "manualDate" }] },
    { code: 'const s = "2020-01-01T00:00:00";', filename: "t.ts", errors: [{ messageId: "manualDate" }] },
  ],
});
