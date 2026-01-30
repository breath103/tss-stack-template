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
  },
  // No database = automatic stateless mode
  // Session stored in signed cookie
} satisfies BetterAuthOptions);
