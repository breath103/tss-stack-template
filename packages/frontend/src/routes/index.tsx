import { createRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ApiClient } from "../lib/api-client";
import type { ApiRoutes } from "@app/backend/api";
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
        body: { message: "Hello from frontend!", count: 42 },
      })
      .then(setEchoResult)
      .catch(console.error);
  }, []);

  const frontendEnv = {
    REQUIRED_FOO: process.env.REQUIRED_FOO,
    OPTIONAL_FOO: process.env.OPTIONAL_FOO,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">TSS Stack Template</h1>
        <p className="text-gray-600 mt-1">Type-Safe Full Serverless Stack</p>
      </div>

      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Frontend Env</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(frontendEnv, null, 2)}
        </pre>
      </section>

      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Backend Health</h2>
        {health ? (
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(health, null, 2)}
          </pre>
        ) : (
          <p className="text-gray-500">Loading...</p>
        )}
      </section>

      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">API Response</h2>
        {message ? (
          <p className="text-gray-700">{message}</p>
        ) : (
          <p className="text-gray-500">Loading...</p>
        )}
      </section>

      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Echo Test (POST with params + body)</h2>
        {echoResult ? (
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(echoResult, null, 2)}
          </pre>
        ) : (
          <p className="text-gray-500">Loading...</p>
        )}
      </section>
    </div>
  );
}
