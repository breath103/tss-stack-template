// Flags `new HTTPException(status, { message })` — a human-readable string baked into an API
// error. Throw `new ApiError(status, { type, ...data })` instead; the frontend owns the text.
// (Coding guideline: sharing-code/api-errors-are-typed-codes-messages-live-on-the-frontend.)

interface Node {
  type: string;
  callee?: { type: string; name?: string };
  arguments?: { type: string; properties?: { type: string; key?: { type: string; name?: string } }[] }[];
}
interface Context {
  report: (diagnostic: { node: Node; messageId: string }) => void;
}

const rule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow message strings in HTTPException — throw a typed ApiError code" },
    messages: {
      message:
        'Throw `new ApiError(status, { type: "…" })` with a code added to `ApiErrorBody`; put the human-readable text in the frontend\'s `api-error-message.i18n.json`.',
    },
    schema: [],
  },
  create(context: Context) {
    return {
      NewExpression(node: Node) {
        if (node.callee?.type !== "Identifier" || node.callee.name !== "HTTPException") return;
        const options = node.arguments?.[1];
        if (options?.type !== "ObjectExpression") return;
        const hasMessage = options.properties?.some(
          p => p.type === "Property" && p.key?.type === "Identifier" && p.key.name === "message"
        );
        if (hasMessage) context.report({ node, messageId: "message" });
      },
    };
  },
};

export default rule;
