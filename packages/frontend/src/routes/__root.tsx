import { createRootRoute, Link, Outlet } from "@tanstack/react-router";

import { useSession } from "@/contexts/AuthContext";
import { signIn, signOut } from "@/lib/auth-client";

function RootComponent() {
  const session = useSession();

  return (
    <div className="min-h-screen bg-background text-text-1">
      <nav className="flex items-center justify-between border-b border-border bg-surface-1 px-6 py-4">
        <div className="flex gap-6">
          <Link
            to="/"
            className="text-text-2 hover:text-text-1"
            activeProps={{ className: "text-accent-1 font-semibold" }}
          >
            Home
          </Link>
          <Link
            to="/about"
            className="text-text-2 hover:text-text-1"
            activeProps={{ className: "text-accent-1 font-semibold" }}
          >
            About
          </Link>
          <Link
            to="/design"
            className="text-text-2 hover:text-text-1"
            activeProps={{ className: "text-accent-1 font-semibold" }}
          >
            Design
          </Link>
        </div>
        <div>
          {session?.user ? (
            <div className="flex items-center gap-3">
              <span className="text-text-2">{session.user.name}</span>
              <button onClick={() => void signOut()} className="text-sm text-text-3 hover:text-text-1">
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => void signIn.social({ provider: "google" })}
              className="rounded-sm bg-accent-1 px-3 py-1.5 text-sm text-accent-1-fg hover:opacity-90"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export const rootRoute = createRootRoute({
  component: RootComponent,
});
