import type { Context, Env, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

import type { RouteCollection, RouteDef } from "./route.js";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type SchemaShape = Record<string, z.ZodTypeAny>;

export function registerToHono<E extends Env>(
  app: Hono<E>,
  routeCollection: RouteCollection<Context<E>, RouteDef[]>
): void {
  for (const routeDef of routeCollection.routes) {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method -- RouteDef uses `any` by design */
    const { path, method, querySchema, bodySchema, handler } = routeDef;
    const httpMethod = (method as string).toLowerCase() as Lowercase<HttpMethod>;

    app[httpMethod](path, async (c) => {
      const params = c.req.param();

      let parsedQuery = {};
      if (querySchema) {
        const rawQuery = c.req.query();
        const schema = z.object(querySchema as SchemaShape);
        const result = schema.safeParse(rawQuery);
        if (!result.success) {
          throw new HTTPException(400, { message: "Invalid query parameters" });
        }
        parsedQuery = result.data;
      }

      let parsedBody = {};
      if (bodySchema) {
        const rawBody: unknown = await c.req.json().catch(() => ({}));
        const schema = z.object(bodySchema as SchemaShape);
        const result = schema.safeParse(rawBody);
        if (!result.success) {
          throw new HTTPException(400, { message: "Invalid request body" });
        }
        parsedBody = result.data;
      }

      const response: unknown = await handler({
        params,
        query: parsedQuery,
        body: parsedBody,
        c: c as unknown as Context<E>,
      });

      // Allow handlers to return raw Response objects (for streaming, etc.)
      if (response instanceof Response) {
        return response;
      }

      return c.json(response);
    });
  }
}
