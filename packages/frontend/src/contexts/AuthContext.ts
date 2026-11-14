import type { Session } from "@backend/lib/auth";
import { createContext, createElement, type ReactNode, useContext, useEffect, useState } from "react";
import { exhaustMap, filter, startWith } from "rxjs";

import { sessionStale$, unauthenticated$ } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { sessionCache } from "@/lib/session-cache";

const AuthContext = createContext<Session | null | undefined>(undefined);

let loadedAt = Number.NEGATIVE_INFINITY;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(() => sessionCache.load() ?? undefined);

  useEffect(() => {
    const stale$ = sessionStale$.pipe(filter(startedAt => startedAt > loadedAt));
    const reloads = (sessionCache.load() ? stale$ : stale$.pipe(startWith(undefined)))
      // Signals that arrive while a reload is in flight ride on that reload.
      .pipe(exhaustMap(() => authClient.getSession()))
      .subscribe(({ data, error }) => {
        // A failed reload isn't a sign-out. The next API response signals again.
        if (error && sessionCache.load()) return;
        if (data) {
          sessionCache.save(data);
        } else {
          sessionCache.clear();
        }
        setSession(data);
        loadedAt = performance.now();
      });
    const signOuts = unauthenticated$.subscribe(() => {
      sessionCache.clear();
      setSession(null);
    });
    return () => {
      reloads.unsubscribe();
      signOuts.unsubscribe();
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
