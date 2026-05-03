import { betterAuth, BetterAuthOptions } from "better-auth";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
  advanced: {
    // Infer baseURL from x-forwarded-host/proto headers (required behind CloudFront)
    trustedProxyHeaders: true,
    // Only set in dev (by scripts/server.ts) so multiple worktrees on localhost don't
    // share session cookies. Unset in production → better-auth's default prefix.
    cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX,
  },
  // No database = automatic stateless mode
  // Session stored in signed cookie
} satisfies BetterAuthOptions);
