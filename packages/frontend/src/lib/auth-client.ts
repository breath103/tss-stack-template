import type { BetterAuthClientOptions } from "better-auth";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "", // Same origin
} satisfies BetterAuthClientOptions);

export const { signIn, signOut, useSession } = authClient;
