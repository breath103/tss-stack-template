import { RuleTester } from "oxlint/plugins-dev";
import { describe, it } from "vitest";

import noStaticLiteralInComponent from "./no-static-literal-in-component.js";

RuleTester.describe = describe;
RuleTester.it = it;

const errors = [{ messageId: "hoist" }];

new RuleTester().run("no-static-literal-in-component", noStaticLiteralInComponent, {
  valid: [
    { code: "const ROWS = [0, 1, 2];\nfunction List() { return ROWS.map(i => <Row key={i} />); }", filename: "t.tsx" },
    { code: "function List() { return Array.from({ length: 3 }, (_, i) => <Row key={i} />); }", filename: "t.tsx" },
    { code: "function List({ a }) { const pair = [a, 1]; return pair.map(i => <Row key={i} />); }", filename: "t.tsx" },
    { code: "function List({ a }) { return [a, 1].map(i => <Row key={i} />); }", filename: "t.tsx" },
    {
      code: "function Box() { const [open, setOpen] = useState([]); const empty = {}; return null; }",
      filename: "t.tsx",
    },
    { code: "function Box() { return <div style={{ width: 4 }} />; }", filename: "t.tsx" },
    { code: 'function Box() { const form = useForm({ mode: "onChange" }); return null; }', filename: "t.tsx" },
    { code: "function Box() { let rows = [1, 2]; rows = []; return rows; }", filename: "t.tsx" },
    { code: "function helper() { const sizes = [1, 2]; return sizes; }", filename: "t.ts" },
    { code: "function Box({ kind }) { const styles = { a: kind }; return styles; }", filename: "t.tsx" },
  ],
  invalid: [
    { code: "function List() { return [0, 1, 2].map(i => <Row key={i} />); }", filename: "t.tsx", errors },
    { code: 'function List() { return (["a", "b"] as const).map(i => <Row key={i} />); }', filename: "t.tsx", errors },
    {
      code: 'function Pill({ kind }) { const styles = { draft: "a", failed: "b" }; return styles[kind]; }',
      filename: "t.tsx",
      errors,
    },
    {
      code: 'const Pill = ({ kind }) => { const sizes = ["s", "m"] as const; return sizes; };',
      filename: "t.tsx",
      errors,
    },
    { code: 'function useSizes() { const sizes = [{ id: 1, label: "s" }]; return sizes; }', filename: "t.ts", errors },
    {
      code: "function List() { const onClick = () => { for (const n of [1, 2]) run(n); }; return onClick; }",
      filename: "t.tsx",
      errors,
    },
  ],
});
