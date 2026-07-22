import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noAsError from "./no-as-error.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-as-error", noAsError, {
  valid: [
    { code: "const m = e instanceof Error ? e.message : String(e);", filename: "t.ts" },
    { code: "const x = foo as Bar;", filename: "t.ts" },
    { code: "const x = foo as ErrorLike;", filename: "t.ts" },
  ],
  invalid: [
    { code: "const x = e as Error;", filename: "t.ts", errors: [{ messageId: "asError" }] },
    { code: "function f(e: unknown) { return (e as Error).message; }", filename: "t.ts", errors: [{ messageId: "asError" }] },
  ],
});
