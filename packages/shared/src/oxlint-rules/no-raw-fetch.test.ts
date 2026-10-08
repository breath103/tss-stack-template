import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noRawFetch from "./no-raw-fetch.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-raw-fetch", noRawFetch, {
  valid: [
    { code: 'api.fetch("/x");', filename: "t.ts" },
    { code: "fetch(url);", filename: "t.ts" },
    { code: 'fetch("https://x.com/y");', filename: "t.ts" },
  ],
  invalid: [{ code: 'fetch("/api/x");', filename: "t.ts", errors: [{ messageId: "rawFetch" }] }],
});
