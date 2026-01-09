import { betterAuth } from "better-auth";

export const auth = betterAuth({
  trustedProxyHeaders: true, // Infer baseURL from x-forwarded-host/proto headers
  secret: process.env.BETTER_AUTH_SECRET,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
  // No database = automatic stateless mode
  // Session stored in signed cookie
});
