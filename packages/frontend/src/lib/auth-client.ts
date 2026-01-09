import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "", // Same origin
});

export const { signIn, signOut, useSession } = authClient;
