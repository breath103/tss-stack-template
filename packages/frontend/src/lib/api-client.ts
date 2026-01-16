// Check if a type is never
type IsNever<T> = [T] extends [never] ? true : false;

// Routes shape from backend's ExtractRoutes
type Routes = {
  [path: string]: {
    [method: string]: {
      params: unknown;
      query: unknown;
      body: unknown;
      response: unknown;
    };
  };
};

// Build options type based on what the route needs
type FetchOptions<T> = (IsNever<T extends { params: infer P } ? P : never> extends true
  ? unknown
  : { params: T extends { params: infer P } ? P : never }) &
  (IsNever<T extends { query: infer Q } ? Q : never> extends true
    ? unknown
    : { query: T extends { query: infer Q } ? Q : never }) &
  (IsNever<T extends { body: infer B } ? B : never> extends true
    ? unknown
    : { body: T extends { body: infer B } ? B : never });

// Check if options are required
type HasRequired<T> = IsNever<T extends { params: infer P } ? P : never> extends true
  ? IsNever<T extends { query: infer Q } ? Q : never> extends true
    ? IsNever<T extends { body: infer B } ? B : never> extends true
      ? false
      : true
    : true
  : true;

// API client class
export class ApiClient<T extends Routes> {
  async fetch<P extends keyof T & string, M extends keyof T[P] & string>(
    ...args: HasRequired<T[P][M]> extends true
      ? [path: P, method: M, options: FetchOptions<T[P][M]>]
      : [path: P, method: M, options?: FetchOptions<T[P][M]>]
  ): Promise<T[P][M] extends { response: infer R } ? R : never> {
    const [path, method, options] = args as [string, string, {
      params?: Record<string, string | number>;
      query?: Record<string, unknown>;
      body?: Record<string, unknown>;
    }?];

    // Replace path params
    let url = path;
    if (options?.params) {
      url = path.replace(/:(\w+)/g, (_, key) => {
        const value = options.params![key];
        if (value === undefined) throw new Error(`Missing param: ${key}`);
        return encodeURIComponent(String(value));
      });
    }

    // Add query string
    if (options?.query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }
}
