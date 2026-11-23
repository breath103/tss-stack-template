// Flags JSX `<textarea>` and text-like `<input>` (no `type`, a dynamic `type`, or
// text/email/password/url/tel/search/number). Non-text controls (file, checkbox,
// radio, range, color, hidden) and the `type="time"` exception stay native; dates
// are `local/no-native-date-input`.

import type { Context } from "./plugin-api.ts";

interface Node {
  type: string;
  name?: { type: string; name?: string };
  attributes?: Attribute[];
}
interface Attribute {
  type: string;
  name?: { name?: string };
  value?: { type: string; value?: unknown } | null;
}

const NATIVE_TYPES = new Set([
  "file",
  "time",
  "checkbox",
  "radio",
  "range",
  "color",
  "hidden",
  "date",
  "datetime-local",
]);

function isTextInput(node: Node): boolean {
  const type = node.attributes?.find(attr => attr.type === "JSXAttribute" && attr.name?.name === "type");
  if (!type) return true;
  const value = type.value;
  if (value?.type !== "Literal" || typeof value.value !== "string") return true;
  return !NATIVE_TYPES.has(value.value);
}

const rule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow raw `<input>` / `<textarea>` text fields" },
    messages: {
      rawTextInput:
        "Use `Input` from `@ui/components/Input` instead of a raw `<{{tag}}>` (`multiline` / `autoresize` for a textarea). If the primitive lacks a prop you need, add it there.",
    },
    schema: [],
  },
  create(context: Context) {
    return {
      JSXOpeningElement(node: Node) {
        const tag = node.name?.name;
        if (node.name?.type !== "JSXIdentifier" || (tag !== "input" && tag !== "textarea")) return;
        if (tag === "input" && !isTextInput(node)) return;
        context.report({ node, messageId: "rawTextInput", data: { tag } });
      },
    };
  },
};

export default rule;
