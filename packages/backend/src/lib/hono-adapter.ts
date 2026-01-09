import { z } from "zod";
import type { Hono, Env, Context } from "hono";
import type { RouteDef, RouteCollection } from "./route.js";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type SchemaShape = Record<string, z.ZodTypeAny>;

export function registerToHono<E extends Env>(
  app: Hono<E>,
  routeCollection: RouteCollection<Context<E>, RouteDef<any, any, any, any, any, any>[]>
): void {
  for (const routeDef of routeCollection.routes) {
    const { path, method, querySchema, bodySchema, handler } = routeDef;
    const httpMethod = method.toLowerCase() as Lowercase<HttpMethod>;

    app[httpMethod](path, async (c) => {
      try {
        const params = c.req.param();

        let parsedQuery = {};
        if (querySchema) {
          const rawQuery = c.req.query();
          const schema = z.object(querySchema as SchemaShape);
          const result = schema.safeParse(rawQuery);
          if (!result.success) {
            return c.json({ error: "Invalid query", details: result.error.flatten() }, 400);
          }
          parsedQuery = result.data;
        }

        let parsedBody = {};
        if (bodySchema) {
          const rawBody = await c.req.json().catch(() => ({}));
          const schema = z.object(bodySchema as SchemaShape);
          const result = schema.safeParse(rawBody);
          if (!result.success) {
            return c.json({ error: "Invalid body", details: result.error.flatten() }, 400);
          }
          parsedBody = result.data;
        }

        const response = await handler({
          params,
          query: parsedQuery,
          body: parsedBody,
          c: c as unknown as Context<E>,
        });
        return c.json(response);
      } catch (error) {
        console.error("Route error:", error);
        return c.json({ error: "Internal server error" }, 500);
      }
    });
  }
}
