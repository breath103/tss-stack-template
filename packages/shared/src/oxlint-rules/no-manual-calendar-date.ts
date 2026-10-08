// Flags manual Date getters and hardcoded day-boundary time strings — use
// date-fns for calendar date formatting, date-part math, and day boundaries.
// (Coding guidelines: backend/use-date-fns-for-calendar-date-formatting and
// sharing-code/use-date-fns-for-calendar-date-formatting.)

interface Node {
  type: string;
  value?: unknown;
  property?: { name?: string };
}
interface Context {
  report: (diagnostic: { node: Node; messageId: string }) => void;
}

const DATE_GETTERS = new Set(["getUTCFullYear", "getUTCMonth", "getUTCDate", "getFullYear", "getMonth", "getDate"]);

const rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Use date-fns instead of manual Date getters or hardcoded day-boundary time strings" },
    messages: {
      manualDate:
        "Use date-fns for calendar date formatting/date-part math/day boundaries instead of manual Date getters or hardcoded time strings.",
    },
    schema: [],
  },
  create(context: Context) {
    return {
      MemberExpression(node: Node) {
        const name = node.property?.name;
        if (name && DATE_GETTERS.has(name)) {
          context.report({ node, messageId: "manualDate" });
        }
      },
      Literal(node: Node) {
        if (
          typeof node.value === "string" &&
          (node.value.includes("T00:00:00") || node.value.includes("T23:59:59.999"))
        ) {
          context.report({ node, messageId: "manualDate" });
        }
      },
    };
  },
};

export default rule;
