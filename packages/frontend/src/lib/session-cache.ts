import type { Session } from "@backend/lib/auth";
import { LocalStoredValue } from "@ui/lib/local-stored-value";
import { z } from "zod";

// `satisfies` fails the type-check when the backend Session gains a field this
// schema doesn't cover; anything stored that no longer parses is evicted.
const sessionSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    emailVerified: z.boolean(),
    image: z.string().nullable().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
  session: z.object({
    id: z.string(),
    userId: z.string(),
    expiresAt: z.date(),
    createdAt: z.date(),
    updatedAt: z.date(),
    ipAddress: z.string().nullable().optional(),
    userAgent: z.string().nullable().optional(),
  }),
}) satisfies z.ZodType<Session>;

export const sessionCache = new LocalStoredValue("auth-session:v1", sessionSchema);
