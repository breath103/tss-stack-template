import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noTopLevelAwait from "./no-top-level-await.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-top-level-await", noTopLevelAwait, {
  valid: [
    { code: "async function main() { await run(); }\nmain().catch(() => process.exit(1));", filename: "t.ts" },
    { code: "const run = async () => { for await (const x of xs) use(x); };", filename: "t.ts" },
    { code: 'async function main() { const { x } = await import("./x.js"); return x; }', filename: "t.ts" },
    { code: "class A { async run() { await go(); } }", filename: "t.ts" },
  ],
  invalid: [
    { code: "await run();", filename: "t.ts", errors: [{ messageId: "topLevelAwait" }] },
    { code: 'const { x } = await import("./x.js");', filename: "t.ts", errors: [{ messageId: "topLevelAwait" }] },
    { code: "if (flag) { await run(); }", filename: "t.ts", errors: [{ messageId: "topLevelAwait" }] },
    {
      code: "export {};\nfor await (const x of xs) use(x);",
      filename: "t.ts",
      errors: [{ messageId: "topLevelAwait" }],
    },
  ],
});
