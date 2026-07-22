import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noManualDateFormat from "./no-manual-date-format.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-manual-date-format", noManualDateFormat, {
  valid: [
    { code: "const n = x.toLocaleString();", filename: "t.ts" },
    { code: 'import { addDays } from "date-fns";', filename: "t.ts" },
  ],
  invalid: [
    { code: 'const s = d.toLocaleDateString("en");', filename: "t.ts", errors: [{ messageId: "manualFormat" }] },
    { code: 'const f = new Intl.DateTimeFormat("en");', filename: "t.ts", errors: [{ messageId: "manualFormat" }] },
    { code: 'import { format } from "date-fns";', filename: "t.ts", errors: [{ messageId: "manualFormat" }] },
  ],
});
