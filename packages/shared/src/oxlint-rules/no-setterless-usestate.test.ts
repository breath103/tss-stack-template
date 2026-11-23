import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noSetterlessUsestate from "./no-setterless-usestate.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-setterless-usestate", noSetterlessUsestate, {
  valid: [
    { code: "const [open, setOpen] = useState(false);", filename: "t.tsx" },
    { code: "const [, setTick] = useState(0);", filename: "t.tsx" },
    { code: "const subject = useMemo(() => new Subject(), []);", filename: "t.tsx" },
    { code: "const [first] = items;", filename: "t.tsx" },
  ],
  invalid: [
    {
      code: "const [subject] = useState(() => new Subject());",
      filename: "t.tsx",
      errors: [{ messageId: "setterless" }],
    },
    { code: "const [locale] = React.useState(detect);", filename: "t.tsx", errors: [{ messageId: "setterless" }] },
  ],
});
