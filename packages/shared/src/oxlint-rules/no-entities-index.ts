// Flags re-deriving backend types via `Entities["..."]` string-literal index.
// (Coding guideline: frontend/import-backend-types-directly.)

interface Node {
  type: string;
  objectType?: { type: string; typeName?: { type: string; name?: string } };
  indexType?: { type: string };
}
interface Context {
  report: (diagnostic: { node: Node; messageId: string }) => void;
}

const rule = {
  meta: {
    type: "suggestion",
    requires: "supabase",
    docs: { description: 'Disallow re-deriving backend types via Entities["..."]' },
    messages: {
      entitiesIndex: 'Import the type from "@backend/types/database" instead of re-deriving it via Entities["..."].',
    },
    schema: [],
  },
  create(context: Context) {
    return {
      TSIndexedAccessType(node: Node) {
        const obj = node.objectType;
        if (
          obj?.type === "TSTypeReference" &&
          obj.typeName?.name === "Entities" &&
          node.indexType?.type === "TSLiteralType"
        ) {
          context.report({ node, messageId: "entitiesIndex" });
        }
      },
    };
  },
};

export default rule;
