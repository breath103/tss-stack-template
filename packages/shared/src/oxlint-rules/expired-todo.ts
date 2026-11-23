// Turns a dated TODO (`TODO:`, then `[yyyy/mm/dd]`) into a lint error once that day
// arrives, so code written to support a retiring format (legacy URL params, an
// old payload shape) gets deleted instead of living forever. A `TODO: [` whose
// date isn't `yyyy/mm/dd` is flagged too, or it would silently never expire.
// (Coding guideline: frontend/date-every-legacy-format-shim-with-an-expiring-todo.)

interface Comment {
  value: string;
  loc: { start: { line: number; column: number }; end: { line: number; column: number } };
}
interface Context {
  sourceCode: { getAllComments: () => Comment[] };
  report: (diagnostic: { loc: Comment["loc"]; messageId: string; data?: Record<string, string> }) => void;
}

const DATED_TODO_RE = /TODO:\s*\[([^\]]*)\]/g;
const DATE_RE = /^(\d{4})\/(\d{2})\/(\d{2})$/;

function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`;
}

const rule = {
  meta: {
    type: "problem",
    docs: { description: "Fail once a `TODO: [yyyy/mm/dd]` date has arrived" },
    messages: {
      expired:
        "TODO dated {{date}} has expired: delete the code it marks (and any legacy-format support it guards), then the TODO.",
      malformed: "Dated TODO must use `TODO: [yyyy/mm/dd]` — got `[{{date}}]`.",
    },
    schema: [],
  },
  create(context: Context) {
    return {
      Program() {
        const now = today();
        for (const comment of context.sourceCode.getAllComments()) {
          for (const [, date] of comment.value.matchAll(DATED_TODO_RE)) {
            if (!DATE_RE.test(date)) {
              context.report({ loc: comment.loc, messageId: "malformed", data: { date } });
            } else if (date <= now) {
              context.report({ loc: comment.loc, messageId: "expired", data: { date } });
            }
          }
        }
      },
    };
  },
};

export default rule;
