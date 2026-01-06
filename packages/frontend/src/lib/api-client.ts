// Type utilities - these must match the backend's ExtractRoutes output
type RouteInfo = {
  params: unknown;
  query: unknown;
  body: unknown;
  response: unknown;
};

type RouteMethods = {
  [method: string]: RouteInfo;
};

type Routes = {
  [path: string]: RouteMethods;
};

// Check if a type is never
type IsNever<T> = [T] extends [never] ? true : false;

// Build request options based on what the route needs
type RequestOptions<T extends RouteInfo> = (IsNever<T["params"]> extends true
  ? {}
  : { params: T["params"] }) &
  (IsNever<T["query"]> extends true ? {} : { query: T["query"] }) &
  (IsNever<T["body"]> extends true ? {} : { body: T["body"] });

// Check if any options are required
type HasRequiredOptions<T extends RouteInfo> = IsNever<T["params"]> extends true
  ? IsNever<T["query"]> extends true
    ? IsNever<T["body"]> extends true
      ? false
      : true
    : true
  : true;

// Method signature - options required only if route has params/query/body
type MethodFn<T extends RouteInfo> = HasRequiredOptions<T> extends true
  ? (options: RequestOptions<T>) => Promise<T["response"]>
  : (options?: RequestOptions<T>) => Promise<T["response"]>;

// API client type
type ApiClient<T extends Routes> = {
  [Path in keyof T]: {
    [Method in keyof T[Path]]: MethodFn<T[Path][Method]>;
  };
};

// Replace path parameters with actual values
function buildPath(
  path: string,
  params?: Record<string, string | number>
): string {
  if (!params) return path;
  return path.replace(/:(\w+)/g, (_, key) => {
    const value = params[key];
    if (value === undefined) {
      throw new Error(`Missing path parameter: ${key}`);
    }
    return encodeURIComponent(String(value));
  });
}

// Build query string
function buildQueryString(query?: Record<string, unknown>): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }
  const str = params.toString();
  return str ? `?${str}` : "";
}

// Create the API client
export function createApiClient<T extends Routes>(): ApiClient<T> {
  return new Proxy({} as ApiClient<T>, {
    get(_, path: string) {
      return new Proxy(
        {},
        {
          get(_, method: string) {
            return async (options?: {
              params?: Record<string, string | number>;
              query?: Record<string, unknown>;
              body?: Record<string, unknown>;
            }) => {
              const url =
                buildPath(path, options?.params) +
                buildQueryString(options?.query);

              const fetchOptions: RequestInit = {
                method: method.toUpperCase(),
                headers: {
                  "Content-Type": "application/json",
                },
              };

              if (options?.body) {
                fetchOptions.body = JSON.stringify(options.body);
              }

              const response = await fetch(url, fetchOptions);

              if (!response.ok) {
                const error = await response
                  .json()
                  .catch(() => ({ error: "Request failed" }));
                throw new Error(error.error || `HTTP ${response.status}`);
              }

              return response.json();
            };
          },
        }
      );
    },
  });
}
