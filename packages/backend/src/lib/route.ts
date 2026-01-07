import { z } from "zod";
import type { Hono, Context } from "hono";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type SchemaShape = Record<string, z.ZodTypeAny>;

// Extract path params: "/users/:id/posts/:postId" → "id" | "postId"
type ExtractPathParams<T extends string> = T extends `${string}:${infer Param}/${infer Rest}`
  ? Param | ExtractPathParams<`/${Rest}`>
  : T extends `${string}:${infer Param}`
    ? Param
    : never;

// Infer from plain object shape
type InferShape<T> = T extends SchemaShape ? { [K in keyof T]: z.infer<T[K]> } : never;

// Route method definition
type MethodDef<Path extends string> = {
  params?: ExtractPathParams<Path> extends never
    ? undefined
    : { [K in ExtractPathParams<Path>]: z.ZodTypeAny };
  query?: SchemaShape;
  body?: SchemaShape;
  handler: (ctx: {
    params: ExtractPathParams<Path> extends never
      ? Record<string, never>
      : { [K in ExtractPathParams<Path>]: string };
    query: Record<string, unknown>;
    body: Record<string, unknown>;
    c: Context;
  }) => unknown | Promise<unknown>;
};

// Extract route types for frontend
export type ExtractRoutes<T> = {
  [Path in keyof T & string]: {
    [Method in keyof T[Path] & HttpMethod]: T[Path][Method] extends { handler: infer H }
      ? {
          params: T[Path][Method] extends { params: infer P } ? InferShape<P> : never;
          query: T[Path][Method] extends { query: infer Q } ? InferShape<Q> : never;
          body: T[Path][Method] extends { body: infer B } ? InferShape<B> : never;
          response: H extends (...args: any[]) => any ? Awaited<ReturnType<H>> : never;
        }
      : never;
  };
};

// Runtime config type
type RouteMethodConfig = {
  params?: SchemaShape;
  query?: SchemaShape;
  body?: SchemaShape;
  handler: (ctx: { params: any; query: any; body: any; c: Context }) => unknown | Promise<unknown>;
};

// Route definition type
type RouteDef<Path extends string> = Partial<Record<HttpMethod, MethodDef<Path>>>;

// Main createRoute function
export function createRoute<const T extends Record<string, RouteDef<any>>>(
  routes: T
): { routes: T; register: (app: Hono) => void } {
  function register(app: Hono) {
    for (const [path, methods] of Object.entries(
      routes as Record<string, Record<string, RouteMethodConfig>>
    )) {
      for (const [method, config] of Object.entries(methods)) {
        const httpMethod = method.toLowerCase() as Lowercase<HttpMethod>;

        app[httpMethod](path, async (c) => {
          try {
            let params = {};
            if (config.params) {
              const rawParams = c.req.param();
              const schema = z.object(config.params);
              const result = schema.safeParse(rawParams);
              if (!result.success) {
                return c.json({ error: "Invalid params", details: result.error.flatten() }, 400);
              }
              params = result.data;
            }

            let query = {};
            if (config.query) {
              const rawQuery = c.req.query();
              const schema = z.object(config.query);
              const result = schema.safeParse(rawQuery);
              if (!result.success) {
                return c.json({ error: "Invalid query", details: result.error.flatten() }, 400);
              }
              query = result.data;
            }

            let body = {};
            if (config.body) {
              const rawBody = await c.req.json().catch(() => ({}));
              const schema = z.object(config.body);
              const result = schema.safeParse(rawBody);
              if (!result.success) {
                return c.json({ error: "Invalid body", details: result.error.flatten() }, 400);
              }
              body = result.data;
            }

            const response = await config.handler({ params, query, body, c });
            return c.json(response);
          } catch (error) {
            console.error("Route error:", error);
            return c.json({ error: "Internal server error" }, 500);
          }
        });
      }
    }
  }

  return { routes, register };
}
