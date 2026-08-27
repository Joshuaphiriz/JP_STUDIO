import { z } from "zod";

/**
 * Runtime environment validation. Server-only values are validated lazily so the
 * client bundle never touches them. Import `serverEnv()` inside server code only.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  ENCRYPTION_KEY: z.string().min(24),
  CRON_SECRET: z.string().min(8).optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
});

// Client vars are inlined by the bundler, so reference them statically.
const rawClient = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
};

let _client: z.infer<typeof clientSchema> | null = null;
export function clientEnv() {
  if (!_client) {
    const parsed = clientSchema.safeParse(rawClient);
    if (!parsed.success) {
      throw new Error(
        `Invalid public environment variables:\n${z.prettifyError(parsed.error)}`,
      );
    }
    _client = parsed.data;
  }
  return _client;
}

let _server:
  (z.infer<typeof clientSchema> & z.infer<typeof serverSchema>) | null = null;
export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must not be called on the client");
  }
  if (!_server) {
    const parsed = serverSchema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(
        `Invalid server environment variables:\n${z.prettifyError(parsed.error)}`,
      );
    }
    _server = { ...clientEnv(), ...parsed.data };
  }
  return _server;
}
