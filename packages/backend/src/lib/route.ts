import { z } from "zod";
import type { Hono, Context } from "hono";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type SchemaShape = Record<string, z.ZodTypeAny>;

// Extract path params: "/users/:id" → "id"
type ExtractPathParams<T extends string> = T extends `${string}:${infer Param}/${infer Rest}`
  ? Param | ExtractPathParams<`/${Rest}`>
  : T extends `${string}:${infer Param}`
    ? Param
    : never;

// Route definition - type info for extraction + runtime config
type RouteDef<Path extends string, Method extends string, Q, B, R> = {
  path: Path;
  method: Method;
  // Type-level only (for ExtractRoutes)
  _types: { query: Q; body: B; response: R };
  // Runtime fields
  handler: (ctx: any) => any;
  querySchema?: SchemaShape;
  bodySchema?: SchemaShape;
};

// Make keys with undefined in their type optional
type OptionalUndefined<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K]
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>
};

// Simplify intersection types for cleaner output
type Simplify<T> = { [K in keyof T]: T[K] };

// Safe infer - returns never if T is never, otherwise infers shape with optional keys
type SafeInfer<T> = [T] extends [never]
  ? never
  : Simplify<OptionalUndefined<{ [K in keyof T]: z.infer<T[K]> }>>;

export function route<
  const Path extends string,
  const Method extends HttpMethod,
  const Q extends SchemaShape = never,
  const B extends SchemaShape = never,
  R = unknown
>(
  path: Path,
  method: Method,
  config: {
    query?: Q;
    body?: B;
    handler: (ctx: {
      params: { [K in ExtractPathParams<Path>]: string };
      query: SafeInfer<Q>;
      body: SafeInfer<B>;
      c: Context;
    }) => Promise<R> | R;
  }
): RouteDef<Path, Method, SafeInfer<Q>, SafeInfer<B>, R> {
  return {
    path,
    method,
    _types: null as any, // type-level only
    handler: config.handler,
    querySchema: config.query,
    bodySchema: config.body,
  };
}

// Extract routes for frontend - properly handles same path with different methods
export type ExtractRoutes<T extends RouteDef<any, any, any, any, any>[]> = {
  [Path in T[number]["path"]]: {
    [Method in Extract<T[number], { path: Path }>["method"]]:
      Extract<T[number], { path: Path; method: Method }>["_types"] extends { query: infer Q; body: infer B; response: infer R }
        ? {
            params: ExtractPathParams<Path> extends never
              ? never
              : { [K in ExtractPathParams<Path>]: string };
            query: Q;
            body: B;
            response: R;
          }
        : never;
  };
};

// Main routes function
export function routes<const T extends RouteDef<any, any, any, any, any>[]>(
  ...routeDefs: T
): { routes: T; register: (app: Hono) => void } {
  function register(app: Hono) {
    for (const routeDef of routeDefs) {
      const { path, method, querySchema, bodySchema, handler } = routeDef;
      const httpMethod = method.toLowerCase() as Lowercase<HttpMethod>;

      app[httpMethod](path, async (c) => {
        try {
          const params = c.req.param();

          let parsedQuery = {};
          if (querySchema) {
            const rawQuery = c.req.query();
            const schema = z.object(querySchema);
            const result = schema.safeParse(rawQuery);
            if (!result.success) {
              return c.json({ error: "Invalid query", details: result.error.flatten() }, 400);
            }
            parsedQuery = result.data;
          }

          let parsedBody = {};
          if (bodySchema) {
            const rawBody = await c.req.json().catch(() => ({}));
            const schema = z.object(bodySchema);
            const result = schema.safeParse(rawBody);
            if (!result.success) {
              return c.json({ error: "Invalid body", details: result.error.flatten() }, 400);
            }
            parsedBody = result.data;
          }

          const response = await handler({ params, query: parsedQuery, body: parsedBody, c });
          return c.json(response);
        } catch (error) {
          console.error("Route error:", error);
          return c.json({ error: "Internal server error" }, 500);
        }
      });
    }
  }

  return { routes: routeDefs, register };
}
