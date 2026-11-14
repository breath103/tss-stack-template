import { BetterAuthOptions, betterAuth } from "better-auth";
import { customSession } from "better-auth/plugins";

import { SESSION_HASH_COOKIE, sessionHash } from "./session-hash.js";

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
    useSecureCookies: process.env.NODE_ENV === "production",
    // Frontend and backend live on different origins behind CloudFront in
    // production, so the auth cookie needs `SameSite=None; Secure` or the
    // browser drops it on every API request and the session appears to
    // expire after one navigation.
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    },
    // Only set in dev (by scripts/server.ts) so multiple worktrees on localhost don't
    // share session cookies. Unset in production → better-auth's default prefix.
    cookiePrefix: process.env.BETTER_AUTH_COOKIE_PREFIX,
  },

  // Cache the session payload in a signed cookie so /api/auth/get-session
  // serves from the cookie until maxAge expires (no round-trip on cache hit).
  // Without `expiresIn` set, better-auth's 7-day default forces a re-login
  // every week; matching `cookieCache.maxAge` keeps the cache valid for the
  // full session lifetime.
  session: {
    expiresIn: 60 * 60 * 24 * 365, // 1 year
    updateAge: 60 * 60 * 24 * 30, // 30 days — rolling refresh window
    cookieCache: { enabled: true, maxAge: 60 * 60 * 24 * 365 },
  },

  account: {
    // Without `database` config, better-auth defaults to stuffing the entire
    // OAuth account record (id_token + access_token + refresh_token) into
    // chunked `account_data.{0,1,2,...}` cookies — ~10KB on every request,
    // and large enough to blow past the Lambda Function URL header limit
    // (413 on /api/auth/get-session). The tokens aren't used after callback,
    // so the account record is pure dead weight.
    storeAccountCookie: false,
  },

  plugins: [
    customSession(({ user, session: { token: _token, ...session } }, ctx) => {
      // The frontend caches this in localStorage; the token stays in the httpOnly cookie.
      const result = { user, session };
      const cookie = ctx.context.createAuthCookie(SESSION_HASH_COOKIE, { maxAge: ctx.context.sessionConfig.expiresIn });
      ctx.setCookie(cookie.name, sessionHash(result), cookie.attributes);
      return Promise.resolve(result);
    }),
  ],
  // No database = automatic stateless mode
  // Session stored in signed cookie
} satisfies BetterAuthOptions);

/** @public */
export type Session = typeof auth.$Infer.Session;
