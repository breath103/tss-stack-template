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

      <div className="bg-white rounded-lg shadow p-6">
        <ul className="space-y-3 text-gray-700">
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Frontend: React + Vite + Tailwind
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Backend: Hono on AWS Lambda
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Routing: CloudFront + Lambda@Edge
          </li>
          <li className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Type-safe API calls between frontend and backend
          </li>
        </ul>
      </div>
    </div>
  );
}
