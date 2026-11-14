import type { auth } from "@backend/lib/auth";
import type { BetterAuthClientOptions } from "better-auth";
import { customSessionClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { sessionCache } from "@/lib/session-cache";

export const authClient = createAuthClient({
  baseURL: "", // Same origin
  plugins: [customSessionClient<typeof auth>()],
} satisfies BetterAuthClientOptions);

export const { signIn } = authClient;

export async function signOut(): Promise<void> {
  sessionCache.clear();
  await authClient.signOut();
  window.location.reload();
}
