import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noTemplateLiteralClassName from "./no-template-literal-classname.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-template-literal-classname", noTemplateLiteralClassName, {
  valid: [
    { code: 'const x = <div className={cn("a", x)} />;', filename: "t.tsx" },
    { code: 'const x = <div className="a" />;', filename: "t.tsx" },
    { code: "const x = <div className={styles.foo} />;", filename: "t.tsx" },
  ],
  invalid: [
    {
      code: "const x = <div className={`a ${x}`} />;",
      filename: "t.tsx",
      errors: [{ messageId: "templateClassName" }],
    },
  ],
});
