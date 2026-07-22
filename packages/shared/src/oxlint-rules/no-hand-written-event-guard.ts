// Flags hand-written `function is<Something>Event(...)` type-guard declarations for
// event payloads — validate shared event payloads with zod schemas and z.infer-derived
// types instead.
// (Coding guideline: sharing-code/symlink-shared-pure-ts-between-frontend-and-backend.)

interface Node {
  type: string;
  id?: { type: string; name?: string } | null;
}
interface Context {
  report: (diagnostic: { node: Node; messageId: string }) => void;
}

const EVENT_GUARD_RE = /^is[A-Za-z0-9]*Event$/;

const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow hand-written is*Event type-guard declarations — use zod schemas with z.infer-derived types",
    },
    messages: {
      handWrittenGuard:
        "Shared event payload validation must use zod schemas with z.infer-derived types, not hand-written is*Event guards.",
    },
    schema: [],
  },
  create(context: Context) {
    return {
      FunctionDeclaration(node: Node) {
        const name = node.id?.name;
        if (name && EVENT_GUARD_RE.test(name)) {
          context.report({ node, messageId: "handWrittenGuard" });
        }
      },
    };
  },
};

export default rule;
