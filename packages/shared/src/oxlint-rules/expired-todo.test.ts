import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import expiredTodo from "./expired-todo.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("expired-todo", expiredTodo, {
  valid: [
    { code: "// TODO: [2999/01/01] delete this code\nconst a = 1;", filename: "t.ts" },
    { code: "/* TODO: [2999/12/31] drop legacy */ const a = 1;", filename: "t.ts" },
    { code: "// TODO: plain undated todo\nconst a = 1;", filename: "t.ts" },
    { code: 'const s = "TODO: [2000/01/01]";', filename: "t.ts" },
  ],
  invalid: [
    {
      code: "// TODO: [2000/01/01] delete this code\nconst a = 1;",
      filename: "t.ts",
      errors: [{ messageId: "expired" }],
    },
    {
      code: "const a = 1; /* TODO: [2020/06/15] drop the shim */",
      filename: "t.ts",
      errors: [{ messageId: "expired" }],
    },
    {
      code: "// TODO: [20261201] delete this code\nconst a = 1;",
      filename: "t.ts",
      errors: [{ messageId: "malformed" }],
    },
  ],
});
