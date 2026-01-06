import { createRootRoute, Link, Outlet } from "@tanstack/react-router";

export const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex gap-6 px-6 py-4 bg-white border-b border-gray-200">
        <Link
          to="/"
          className="text-gray-600 hover:text-gray-900"
          activeProps={{ className: "text-blue-600 font-semibold" }}
        >
          Home
        </Link>
        <Link
          to="/about"
          className="text-gray-600 hover:text-gray-900"
          activeProps={{ className: "text-blue-600 font-semibold" }}
        >
          About
        </Link>
      </nav>
      <main className="p-6 max-w-4xl mx-auto">
        <Outlet />
      </main>
    </div>
  ),
});
