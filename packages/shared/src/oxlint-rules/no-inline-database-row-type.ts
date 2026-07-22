// Flags an inlined deep index type `Database["public"]["Tables"][...]`. Define
// the row-type alias once in `src/types/database.ts` and import it by name.
// (Coding guideline: backend/use-database-row-types-no-manual-interfaces.)

interface Node {
  type: string;
  objectType?: { type: string; objectType?: { type: string; typeName?: { name?: string } } };
}
interface Context {
  report: (diagnostic: { node: Node; messageId: string }) => void;
}

const rule = {
  meta: {
    type: "suggestion",
    requires: "supabase",
    docs: { description: "Disallow inlined `Database[...][...]` row types" },
    messages: {
      inlineRowType: "Define the row-type alias once in src/types/database.ts and import it by name.",
    },
    schema: [],
  },
  create(context: Context) {
    return {
      TSIndexedAccessType(node: Node) {
        if (node.objectType?.objectType?.typeName?.name === "Database") {
          context.report({ node, messageId: "inlineRowType" });
        }
      },
    };
  },
};

export default rule;
