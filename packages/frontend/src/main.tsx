import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createApiClient } from "./lib/api-client";
import type { ApiRoutes } from "@app/backend/api";

const api = createApiClient<ApiRoutes>();

function App() {
  const [health, setHealth] = useState<Awaited<
    ReturnType<typeof api["/api/health"]["GET"]>
  > | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [echoResult, setEchoResult] = useState<Awaited<
    ReturnType<typeof api["/api/echo/:id"]["POST"]>
  > | null>(null);

  useEffect(() => {
    api["/api/health"].GET().then(setHealth).catch(console.error);

    api["/api/hello"]
      .GET({ query: { name: "TypeSafe" } })
      .then((data) => setMessage(data.message))
      .catch(console.error);

    api["/api/echo/:id"]
      .POST({
        params: { id: "test-123" },
        body: { message: "Hello from frontend!", count: 42 },
      })
      .then(setEchoResult)
      .catch(console.error);
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", padding: "2rem" }}>
      <h1>TSS Stack Template</h1>
      <p>Type-Safe Full Serverless Stack</p>

      <h2>Backend Health</h2>
      {health ? (
        <pre>{JSON.stringify(health, null, 2)}</pre>
      ) : (
        <p>Loading...</p>
      )}

      <h2>API Response</h2>
      {message ? <p>{message}</p> : <p>Loading...</p>}

      <h2>Echo Test (POST with params + body)</h2>
      {echoResult ? (
        <pre>{JSON.stringify(echoResult, null, 2)}</pre>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
