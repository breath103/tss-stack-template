import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noHttpExceptionMessage from "./no-http-exception-message.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-http-exception-message", noHttpExceptionMessage, {
  valid: [
    { code: 'throw new ApiError(400, { type: "invalid_request_body" });', filename: "t.ts" },
    { code: "throw new HTTPException(401);", filename: "t.ts" },
    { code: "throw new HTTPException(401, { res });", filename: "t.ts" },
    { code: "class E extends HTTPException { constructor() { super(400, { message: code }); } }", filename: "t.ts" },
  ],
  invalid: [
    {
      code: 'throw new HTTPException(404, { message: "Not found" });',
      filename: "t.ts",
      errors: [{ messageId: "message" }],
    },
    {
      code: "const e = () => new HTTPException(409, { message: `taken: ${slug}` });",
      filename: "t.ts",
      errors: [{ messageId: "message" }],
    },
  ],
});
