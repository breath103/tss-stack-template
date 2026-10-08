// Flags UI date formatting done manually — format UI dates through the shared
// DateFormatter (`@ui/lib/date-formatter`), constructed with the current locale:
// `new DateFormatter(locale).format(date, type)`.
// (Coding guideline: frontend/format-ui-dates-through-dateformatter.)

interface Node {
  type: string;
  callee?: { type?: string; property?: { name?: string }; object?: { name?: string } };
  arguments?: unknown[];
  source?: { value?: unknown };
  specifiers?: Specifier[];
}
interface Specifier {
  type: string;
  imported?: { name?: string };
}
interface Context {
  report: (diagnostic: { node: Node | Specifier; messageId: string }) => void;
}

const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Format UI dates through DateFormatter instead of toLocale*String / Intl.DateTimeFormat / date-fns format",
    },
    messages: {
      manualFormat:
        "Format UI dates through the shared DateFormatter (`@ui/lib/date-formatter`) — `new DateFormatter(locale).format(date, type)` — not toLocale*String / Intl.DateTimeFormat / date-fns format.",
    },
    schema: [],
  },
  create(context: Context) {
    return {
      CallExpression(node: Node) {
        const callee = node.callee;
        if (
          callee?.type === "MemberExpression" &&
          typeof callee.property?.name === "string" &&
          /^toLocale(Date|Time)?String$/.test(callee.property.name) &&
          (node.arguments?.length ?? 0) > 0
        ) {
          context.report({ node, messageId: "manualFormat" });
        }
      },
      NewExpression(node: Node) {
        const callee = node.callee;
        if (
          callee?.type === "MemberExpression" &&
          callee.object?.name === "Intl" &&
          callee.property?.name === "DateTimeFormat"
        ) {
          context.report({ node, messageId: "manualFormat" });
        }
      },
      ImportDeclaration(node: Node) {
        if (node.source?.value !== "date-fns") return;
        for (const spec of node.specifiers ?? []) {
          if (spec.type === "ImportSpecifier" && spec.imported?.name === "format") {
            context.report({ node: spec, messageId: "manualFormat" });
          }
        }
      },
    };
  },
};

export default rule;
