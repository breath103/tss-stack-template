import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noProcessEnvBang from "./no-process-env-bang.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-process-env-bang", noProcessEnvBang, {
  valid: [
    { code: "const x = cfg.value!;", filename: "t.ts" },
    { code: "const y = process.env.FOO;", filename: "t.ts" },
  ],
  invalid: [
    { code: "const x = process.env.FOO!;", filename: "t.ts", errors: [{ messageId: "envBang" }] },
  ],
});
