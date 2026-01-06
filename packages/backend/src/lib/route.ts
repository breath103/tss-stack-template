import { z } from "zod";
import type { Hono, Context } from "hono";

// HTTP methods supported
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

// Extract path parameter names from a path template
// "/api/users/:userId/posts/:postId" → "userId" | "postId"
type ExtractPathParams<T extends string> = T extends `${string}:${infer Param}/${infer Rest}`
  ? Param | ExtractPathParams<`/${Rest}`>
  : T extends `${string}:${infer Param}`
    ? Param
    : never;

// Helper to extract zod inferred type or never
type InferZodOrNever<T> = T extends z.ZodObject<z.ZodRawShape> ? z.infer<T> : never;

// Route method config - used internally
type RouteMethodConfig = {
  params?: z.ZodObject<z.ZodRawShape>;
  query?: z.ZodObject<z.ZodRawShape>;
  body?: z.ZodObject<z.ZodRawShape>;
  handler: (ctx: {
    params: any;
    query: any;
    body: any;
    c: Context;
  }) => unknown | Promise<unknown>;
};

// Extract route types for frontend consumption
export type ExtractRoutes<T> = {
  [Path in keyof T]: {
    [Method in keyof T[Path]]: T[Path][Method] extends { handler: infer H }
      ? {
          params: T[Path][Method] extends { params: infer P } ? InferZodOrNever<P> : never;
          query: T[Path][Method] extends { query: infer Q } ? InferZodOrNever<Q> : never;
          body: T[Path][Method] extends { body: infer B } ? InferZodOrNever<B> : never;
          response: H extends (...args: any[]) => any ? Awaited<ReturnType<H>> : never;
        }
      : never;
  };
};

// Infer type or empty object
type InferOrEmpty<T> = T extends z.ZodObject<z.ZodRawShape> ? z.infer<T> : Record<string, never>;

// Handler context type
type HandlerCtx<Path extends string, TQuery, TBody> = {
  params: ExtractPathParams<Path> extends never
    ? Record<string, never>
    : { [K in ExtractPathParams<Path>]: string };
  query: InferOrEmpty<TQuery>;
  body: InferOrEmpty<TBody>;
  c: Context;
};

// Route definition for a single method
type MethodDef<
  Path extends string,
  TQuery extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
  TBody extends z.ZodObject<z.ZodRawShape> | undefined = undefined,
> = {
  query?: TQuery;
  body?: TBody;
  handler: (ctx: HandlerCtx<Path, TQuery, TBody>) => unknown | Promise<unknown>;
} & (ExtractPathParams<Path> extends never
  ? {}
  : { params: z.ZodObject<{ [K in ExtractPathParams<Path>]: z.ZodTypeAny }> });

// Define routes type
type DefineRoutes<T> = {
  [Path in keyof T & string]: {
    [M in keyof T[Path] & HttpMethod]?: MethodDef<Path, any, any>;
  };
};

// Main function to create routes
export function createRoute<
  const T extends DefineRoutes<T>,
>(routes: T) {
  function register(app: Hono) {
    for (const [path, methods] of Object.entries(
      routes as Record<string, Record<string, RouteMethodConfig>>
    )) {
      for (const [method, config] of Object.entries(methods)) {
        const httpMethod = method.toLowerCase() as "get" | "post" | "put" | "delete" | "patch";

        app[httpMethod](path, async (c) => {
          try {
            // Parse and validate params
            let params = {};
            if (config.params) {
              const rawParams = c.req.param();
              const result = config.params.safeParse(rawParams);
              if (!result.success) {
                return c.json({ error: "Invalid params", details: result.error.flatten() }, 400);
              }
              params = result.data;
            }

            // Parse and validate query
            let query = {};
            if (config.query) {
              const rawQuery = c.req.query();
              const result = config.query.safeParse(rawQuery);
              if (!result.success) {
                return c.json({ error: "Invalid query", details: result.error.flatten() }, 400);
              }
              query = result.data;
            }

            // Parse and validate body
            let body = {};
            if (config.body) {
              const rawBody = await c.req.json().catch(() => ({}));
              const result = config.body.safeParse(rawBody);
              if (!result.success) {
                return c.json({ error: "Invalid body", details: result.error.flatten() }, 400);
              }
              body = result.data;
            }

            // Call handler
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
