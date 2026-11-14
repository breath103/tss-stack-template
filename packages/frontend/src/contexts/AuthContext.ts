import type { Session } from "@backend/lib/auth";
import { useOnChange } from "@ui/hooks/useOnChange";
import { createContext, createElement, type ReactNode, useContext, useEffect, useState } from "react";

import { setOnSessionStale, setOnUnauthenticated } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { sessionCache } from "@/lib/session-cache";

const AuthContext = createContext<Session | null | undefined>(undefined);

let sessionFetch: Promise<void> | null = null;
let sessionFetchedAt = Number.NEGATIVE_INFINITY;

function reloadSession(publish: (session: Session | null) => void): void {
  sessionFetch ??= (async () => {
    const { data, error } = await authClient.getSession();
    // A failed reload isn't a sign-out. The next API response signals again.
    if (error && sessionCache.load()) return;
    if (data) {
      sessionCache.save(data);
    } else {
      sessionCache.clear();
    }
    publish(data);
    sessionFetchedAt = performance.now();
  })().finally(() => {
    sessionFetch = null;
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(() => sessionCache.load() ?? undefined);

  useOnChange(() => {
    if (session === undefined) reloadSession(setSession);
  }, []);

  useEffect(() => {
    setOnSessionStale(requestStartedAt => {
      // Responses already in flight when the reload finished still carry the signal.
      if (requestStartedAt > sessionFetchedAt) reloadSession(setSession);
    });
    setOnUnauthenticated(() => {
      sessionCache.clear();
      setSession(null);
    });
    return () => {
      setOnSessionStale(null);
      setOnUnauthenticated(null);
    };
  }, []);

  if (session === undefined) return null;

  return createElement(AuthContext.Provider, { value: session }, children);
}

export function useSession(): Session | null {
  const session = useContext(AuthContext);
  if (session === undefined) throw new Error("useSession() called outside <AuthProvider>");
  return session;
}
