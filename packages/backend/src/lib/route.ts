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

export interface RouteContext<C, Path extends string, Q, B> {
  params: { [K in ExtractPathParams<Path>]: string };
  query: Q;
  body: B;
  c: C;
}

export type RouteDef<C, Path extends string, Method extends string, Q, B, R> = {
  path: Path;
  method: Method;
  _types: { query: Q; body: B; response: R }; // type-level only (for ExtractRoutes)
  handler: (ctx: { params: any; query: any; body: any; c: C }) => Promise<R> | R;
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
      _types: null as any,
      handler: config.handler as any,
      querySchema: config.query,
      bodySchema: config.body,
    };
  };
}

export type RouteCollection<C, T extends RouteDef<C, any, any, any, any, any>[]> = {
  routes: T;
};

export function routesFactory<C>() {
  return function routes<const T extends RouteDef<C, any, any, any, any, any>[]>(
    ...routeDefs: T
  ): RouteCollection<C, T> {
    return { routes: routeDefs };
  };
}

export type ExtractRoutes<T extends RouteDef<any, any, any, any, any, any>[]> = {
  [Path in T[number]["path"]]: {
    [Method in Extract<T[number], { path: Path }>["method"]]: Extract<
      T[number],
      { path: Path; method: Method }
    >["_types"] extends { query: infer Q; body: infer B; response: infer R }
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
