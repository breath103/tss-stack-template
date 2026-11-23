import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noRawTextInput from "./no-raw-text-input.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-raw-text-input", noRawTextInput, {
  valid: [
    { code: 'const x = <Input value={v} onChange={setV} type="email" />;', filename: "t.tsx" },
    { code: 'const x = <input type="file" hidden />;', filename: "t.tsx" },
    { code: 'const x = <input type="time" />;', filename: "t.tsx" },
    { code: 'const x = <input type="checkbox" />;', filename: "t.tsx" },
    { code: 'const x = <input type="range" min={0} max={1} />;', filename: "t.tsx" },
  ],
  invalid: [
    { code: "const x = <input value={v} />;", filename: "t.tsx", errors: [{ messageId: "rawTextInput" }] },
    { code: 'const x = <input type="text" />;', filename: "t.tsx", errors: [{ messageId: "rawTextInput" }] },
    { code: 'const x = <input type="number" />;', filename: "t.tsx", errors: [{ messageId: "rawTextInput" }] },
    { code: "const x = <input type={kind} />;", filename: "t.tsx", errors: [{ messageId: "rawTextInput" }] },
    { code: "const x = <textarea value={v} />;", filename: "t.tsx", errors: [{ messageId: "rawTextInput" }] },
  ],
});
