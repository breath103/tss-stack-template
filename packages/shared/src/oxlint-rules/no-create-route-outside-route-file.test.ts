import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noCreateRouteOutsideRouteFile from "./no-create-route-outside-route-file.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-create-route-outside-route-file", noCreateRouteOutsideRouteFile, {
  valid: [
    {
      code: 'export const r = createRoute({ getParentRoute: () => parent, path: "/x" });',
      filename: "src/routes/x/_route.tsx",
    },
    { code: "const page = createPage();", filename: "src/routes/x/Page.tsx" },
  ],
  invalid: [
    {
      code: 'export const r = createRoute({ getParentRoute: () => parent, path: "/x" });',
      filename: "src/routes/x/Page.tsx",
      errors: [{ messageId: "outsideRouteFile" }],
    },
  ],
});
