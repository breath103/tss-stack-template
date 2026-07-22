import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noI18nProp from "./no-i18n-prop.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-i18n-prop", noI18nProp, {
  valid: [
    { code: "const x = <X placeholder={i18n.foo} />;", filename: "t.tsx" },
    { code: "const x = <X label=\"hi\" />;", filename: "t.tsx" },
  ],
  invalid: [
    {
      code: "const x = <X i18n={dict} />;",
      filename: "t.tsx",
      errors: [{ messageId: "i18nProp" }],
    },
    {
      code: "const x = <X i18n={{ a: 1 }} />;",
      filename: "t.tsx",
      errors: [{ messageId: "i18nProp" }],
    },
  ],
});
