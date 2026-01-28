import { z } from "zod";

import { route as createRoute } from "../lib/app-context.js";

export const route = createRoute("/api/echo/:id", "POST", {
  body: {
    message: z.string(),
    count: z.number().optional(),
    optionalValue: z.number().optional(),
    complexPayload: z.object({
      tuple: z.tuple([z.string(), z.number(), z.number(), z.number()]),
    }),
  },
  handler: ({ params, body }) => ({
    echo: {
      id: params.id,
      message: body.message,
      count: body.count ?? 1,
      tupleFirst: body.complexPayload.tuple[0],
      tupleSecond: body.complexPayload.tuple[1],
    },
  }),
});
