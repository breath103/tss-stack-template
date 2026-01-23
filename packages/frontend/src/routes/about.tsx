import { createRoute } from "@tanstack/react-router";

import { rootRoute } from "./__root";

export const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
  component: About,
});

function About() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">About</h1>
      <p className="text-gray-600">TSS Stack Template - Type-Safe Serverless Stack</p>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <ul className="space-y-3 text-gray-700">
          <li className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-blue-500"></span>
            Frontend: React + Vite + Tailwind
          </li>
          <li className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-blue-500"></span>
            Backend: Hono on AWS Lambda
          </li>
          <li className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-blue-500"></span>
            Routing: CloudFront + Lambda@Edge
          </li>
          <li className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-blue-500"></span>
            Type-safe API calls between frontend and backend
          </li>
        </ul>
      </div>
    </div>
  );
}
