import { useEffect, useState } from "react";

import type { ApiRoutes } from "@app/backend/api";
import { createRoute } from "@tanstack/react-router";

import { ApiClient } from "../lib/api-client";
import { rootRoute } from "./__root";

const api = new ApiClient<ApiRoutes>();

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
});

function Home() {
  const [health, setHealth] = useState<Awaited<
    ReturnType<typeof api.fetch<"/api/health", "GET">>
  > | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [echoResult, setEchoResult] = useState<Awaited<
    ReturnType<typeof api.fetch<"/api/echo/:id", "POST">>
  > | null>(null);

  useEffect(() => {
    api.fetch("/api/health", "GET").then(setHealth).catch(console.error);

    api
      .fetch("/api/hello", "GET", { query: { name: "TypeSafe" } })
      .then((data) => setMessage(data.message))
      .catch(console.error);

    api
      .fetch("/api/echo/:id", "POST", {
        params: { id: "test-123" },
        body: {
          message: "Hello from frontend!",
          count: 42,
          complexPayload: {
            tuple: ["String", 1, 2, 3],
          }
        },
      })
      .then(setEchoResult)
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">TSS Stack Template</h1>
        <p className="mt-1 text-gray-600">Type-Safe Full Serverless Stack</p>
      </div>

      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">Frontend Env</h2>
        <pre className="overflow-auto rounded-sm bg-gray-100 p-4 text-sm">
          {JSON.stringify({
            REQUIRED_FOO: process.env.REQUIRED_FOO,
            OPTIONAL_FOO: process.env.OPTIONAL_FOO,
          }, null, 2)}
        </pre>
      </section>

      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">Backend Health</h2>
        {health ? (
          <pre className="overflow-auto rounded-sm bg-gray-100 p-4 text-sm">
            {JSON.stringify(health, null, 2)}
          </pre>
        ) : (
          <p className="text-gray-500">Loading...</p>
        )}
      </section>

      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">API Response</h2>
        {message ? (
          <p className="text-gray-700">{message}</p>
        ) : (
          <p className="text-gray-500">Loading...</p>
        )}
      </section>

      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-gray-800">Echo Test (POST with params + body)</h2>
        {echoResult ? (
          <pre className="overflow-auto rounded-sm bg-gray-100 p-4 text-sm">
            {JSON.stringify(echoResult, null, 2)}
          </pre>
        ) : (
          <p className="text-gray-500">Loading...</p>
        )}
      </section>
    </div>
  );
}
