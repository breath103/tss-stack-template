import { z } from "zod";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type SchemaShape = Record<string, z.ZodTypeAny>;

// "/users/:id" → "id"
type ExtractPathParams<T extends string> = T extends `${string}:${infer Param}/${infer Rest}`
  ? Param | ExtractPathParams<`/${Rest}`>
  : T extends `${string}:${infer Param}`
    ? Param
    : never;

// { foo: string | undefined } → { foo?: string }
type OptionalUndefined<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
};

type Simplify<T> = { [K in keyof T]: T[K] };

// Infer zod schema shape, making optional fields actually optional
type SafeInfer<T> = [T] extends [never]
  ? never
  : Simplify<OptionalUndefined<{ [K in keyof T]: z.infer<T[K]> }>>;

export interface RouteContext<Context, Path extends string, Query, Body> {
  params: { [K in ExtractPathParams<Path>]: string };
  query: Query;
  body: Body;
  c: Context;
}

export type RouteDef<
  /* eslint-disable @typescript-eslint/no-explicit-any */
  Context = any,
  Path extends string = any,
  Method extends string = any,
  Query = any,
  Body = any,
  Response = any,
  /* eslint-enable @typescript-eslint/no-explicit-any */
> = {
  path: Path;
  method: Method;
  // Method syntax is bivariant, avoiding contravariance issues when collecting routes
  handler(ctx: RouteContext<Context, Path, Query, Body>): Promise<Response> | Response;
  querySchema?: SchemaShape;
  bodySchema?: SchemaShape;
};

export function routeFactory<C>() {
  return function route<
    const Path extends string,
    const Method extends HttpMethod,
    const Q extends SchemaShape = never,
    const B extends SchemaShape = never,
    R = unknown,
  >(
    path: Path,
    method: Method,
    config: {
      query?: Q;
      body?: B;
      handler: (ctx: RouteContext<C, Path, SafeInfer<Q>, SafeInfer<B>>) => Promise<R> | R;
    }
  ): RouteDef<C, Path, Method, SafeInfer<Q>, SafeInfer<B>, R> {
    return {
      path,
      method,
      handler: config.handler,
      querySchema: config.query,
      bodySchema: config.body,
    };
  };
}

export type RouteCollection<C, T extends RouteDef<C>[]> = {
  routes: T;
};

export function routesFactory<C>() {
  return function routes<const T extends RouteDef<C>[]>(
    ...routeDefs: T
  ): RouteCollection<C, T> {
    return { routes: routeDefs };
  };
}

export type ExtractRoutes<T extends RouteDef[]> = {
  [Path in T[number]["path"]]: {
    [Method in Extract<T[number], { path: Path }>["method"]]: Extract<
      T[number],
      { path: Path; method: Method }
    >["handler"] extends (ctx: infer Ctx) => infer Response
      ? Ctx extends { query: infer Query; body: infer Body }
        ? {
            params: ExtractPathParams<Path> extends never
              ? never
              : { [K in ExtractPathParams<Path>]: string };
            query: Query;
            body: Body;
            response: Awaited<Response>;
          }
        : never
      : never;
  };
};
