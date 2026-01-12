import { createRootRoute, Link, Outlet } from "@tanstack/react-router";

import { signIn, signOut, useSession } from "../lib/auth-client";

function RootComponent() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex justify-between items-center px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex gap-6">
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
        </div>
        <div>
          {session?.user ? (
            <div className="flex items-center gap-3">
              <span className="text-gray-700">{session.user.name}</span>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn.social({ provider: "google" })}
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </nav>
      <main className="p-6 max-w-4xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}

export const rootRoute = createRootRoute({
  component: RootComponent,
});
